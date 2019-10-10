import { IContext } from '@bjowes/http-mitm-proxy';
import { injectable, inject } from 'inversify';
import http from 'http';
import https from 'https';
import { NtlmStateEnum } from '../models/ntlm.state.enum';
import { CompleteUrl } from '../models/complete.url.model';
import { IConfigStore } from './interfaces/i.config.store';
import { IConnectionContext } from './interfaces/i.connection.context';
import { INtlmManager } from './interfaces/i.ntlm.manager';
import { TYPES } from './dependency.injection.types';
import { IDebugLogger } from '../util/interfaces/i.debug.logger';
import { INtlm } from '../ntlm/interfaces/i.ntlm';
import { Type2Message } from '../ntlm/type2.message';
import { NtlmMessage } from '../ntlm/ntlm.message';
import { NtlmConfig } from '../models/ntlm.config.model';
import { IWinSsoFacade } from './interfaces/i.win-sso.facade';

@injectable()
export class NtlmManager implements INtlmManager {
  private _configStore: IConfigStore;
  private _ntlm: INtlm;
  private _winSsoFacade: IWinSsoFacade;
  private _debug: IDebugLogger;

  constructor(
    @inject(TYPES.IConfigStore) configStore: IConfigStore,
    @inject(TYPES.INtlm) ntlm: INtlm,
    @inject(TYPES.IWinSsoFacade) winSsoFacade: IWinSsoFacade,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._configStore = configStore;
    this._ntlm = ntlm;
    this._winSsoFacade = winSsoFacade;
    this._debug = debug;
  }

  ntlmHandshake(ctx: IContext, ntlmHostUrl: CompleteUrl, context: IConnectionContext, callback: (error?: NodeJS.ErrnoException, res?: http.IncomingMessage) => void) {
    let fullUrl = ntlmHostUrl.href + ntlmHostUrl.path;
    context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
    let config: NtlmConfig;
    let type1msg: NtlmMessage;
    if (context.useSso) {
      type1msg = this._winSsoFacade.createAuthRequest();
    } else {
      config = this._configStore.get(ntlmHostUrl);
      type1msg = this._ntlm.createType1Message(config.ntlmVersion, config.workstation, config.domain);
    }
    let requestOptions: https.RequestOptions = {
      method: ctx.proxyToServerRequestOptions.method,
      path: ctx.proxyToServerRequestOptions.path,
      host: ctx.proxyToServerRequestOptions.host,
      port: ctx.proxyToServerRequestOptions.port as unknown as string,
      agent: ctx.proxyToServerRequestOptions.agent,
    };
    requestOptions.headers = {};
    requestOptions.headers['authorization'] = type1msg.header();
    requestOptions.headers['connection'] = 'keep-alive';
    let proto = ctx.isSSL ? https : http;
    let type1req = proto.request(requestOptions, (res) => {
      res.resume(); // Finalize the response so we can reuse the socket

      if (this.canHandleNtlmAuthentication(res) === false) {
        this._debug.log('www-authenticate not found on response of second request during NTLM handshake with host', fullUrl);
        context.resetState(ntlmHostUrl);
        return callback(new Error('www-authenticate not found on response of second request during NTLM handshake with host ' + fullUrl));
      }

      context.setState(ntlmHostUrl, NtlmStateEnum.Type2Received);
      let type2msg: Type2Message;
      try {
        type2msg = this._ntlm.decodeType2Message(res.headers['www-authenticate']);
        this._debug.log('Received NTLM message type 2, using NTLMv' + type2msg.version);
        this.debugHeader(res.headers['www-authenticate'], true);
        this.debugHeader(type2msg, false);
      } catch (err) {
        this._debug.log('Cannot parse NTLM message type 2 from host', fullUrl);
        this._debug.log(err);
        context.resetState(ntlmHostUrl);
        return callback(new Error('Cannot parse NTLM message type 2 from host ' + fullUrl));
      }

      let type3msg: NtlmMessage;
      if (context.useSso) {
        let targetFqdn = undefined;
        if (type2msg.targetInfo && type2msg.targetInfo.parsed['FQDN']) {
          targetFqdn = type2msg.targetInfo.parsed['FQDN'];
        }
        type3msg = this._winSsoFacade.createAuthResponse(res.headers['www-authenticate'], targetFqdn, context.peerCert);
      } else {
        type3msg = this._ntlm.createType3Message(type1msg, type2msg, config.username, config.password, config.workstation, config.domain, undefined, undefined);
      }
      let type3requestOptions: https.RequestOptions = {
        method: ctx.proxyToServerRequestOptions.method,
        path: ctx.proxyToServerRequestOptions.path,
        host: ctx.proxyToServerRequestOptions.host,
        port: ctx.proxyToServerRequestOptions.port as unknown as string,
        agent: ctx.proxyToServerRequestOptions.agent,
        headers: ctx.proxyToServerRequestOptions.headers
      };
      if (type3requestOptions.headers) { // Always true, silent the compiler
        type3requestOptions.headers['authorization'] = type3msg.header();
      }
      let type3req = proto.request(type3requestOptions, (res) => {
        res.pause(); // Finalize the response so we can reuse the socket
        this.ntlmHandshakeResponse(res, ntlmHostUrl, context, (err) => {
          return callback(err, res);
        });
      });
      type3req.on('error', (err) => {
        this._debug.log('Error while sending NTLM message type 3:', err);
        context.resetState(ntlmHostUrl);
        return callback(err);
      });
      this._debug.log('Sending NTLM message type 3 with initial client request');
      this.debugHeader(type3msg.header(), true);
      context.setState(ntlmHostUrl, NtlmStateEnum.Type3Sent);
      type3req.write(context.getRequestBody());
      type3req.end();
    });
    type1req.on('error', (err) => {
      this._debug.log('Error while sending NTLM message type 1:', err);
      context.resetState(ntlmHostUrl);
      return callback(err);
    });
    this._debug.log('Sending  NTLM message type 1');
    this.debugHeader(type1msg.header(), true);
    context.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);
    type1req.end();
  }

  ntlmHandshakeResponse(res: http.IncomingMessage, ntlmHostUrl: CompleteUrl, context: IConnectionContext, callback: (error?: NodeJS.ErrnoException) => void) {
    let authState = context.getState(ntlmHostUrl);
    if (authState === NtlmStateEnum.NotAuthenticated) {
      // NTLM auth failed (host may not support NTLM), just pass it through
      return callback();
    }
    if (authState === NtlmStateEnum.Type3Sent) {
      if (res.statusCode === 401) {
        this._debug.log('NTLM authentication failed, invalid credentials.');
        context.resetState(ntlmHostUrl);
        return callback();
      }
      // According to NTLM spec, all other responses than 401 shall be treated as authentication successful
      this._debug.log('NTLM authentication successful for host', ntlmHostUrl.href);
      context.setState(ntlmHostUrl, NtlmStateEnum.Authenticated);
      return callback();
    }

    this._debug.log('Response from server in unexpected NTLM state ' + authState + ', resetting NTLM auth.');
    context.resetState(ntlmHostUrl);
    return callback();
  }

  acceptsNtlmAuthentication(res: http.IncomingMessage): boolean {
    if (res && res.statusCode === 401) {
      // Ensure that we're talking NTLM here
      const wwwAuthenticate = res.headers['www-authenticate'];
      if (wwwAuthenticate &&
          wwwAuthenticate.toUpperCase().split(', ').indexOf('NTLM') !== -1) {
        return true;
      }
    }
    return false;
  }

  canHandleNtlmAuthentication(res: http.IncomingMessage): boolean {
    if (res && res.statusCode === 401) {
      // Ensure that we're talking NTLM here
      const wwwAuthenticate = res.headers['www-authenticate'];
      if (wwwAuthenticate && wwwAuthenticate.startsWith('NTLM ')) {
        return true;
      }
    }
    return false;
  }

  private debugHeader(obj: any, brackets: boolean) {
    if (process.env.DEBUG_NTLM_HEADERS && process.env.DEBUG_NTLM_HEADERS === '1') {
      if (brackets) {
        this._debug.log('[' + obj + ']');
      } else {
        this._debug.log(obj);
      }
    }
  }
}
