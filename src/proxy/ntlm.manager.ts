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

const ntlm = require('../ntlm/ntlm');

@injectable()
export class NtlmManager implements INtlmManager {
  private _configStore: IConfigStore;
  private _debug: IDebugLogger;

  constructor(
    @inject(TYPES.IConfigStore) configStore: IConfigStore,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._configStore = configStore;
    this._debug = debug;
  }

  ntlmHandshake(ctx: IContext, ntlmHostUrl: CompleteUrl, context: IConnectionContext, callback: (error?: NodeJS.ErrnoException) => void) {
    let fullUrl = ntlmHostUrl.href + ntlmHostUrl.path;
    context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
    let config = this._configStore.get(ntlmHostUrl);
    let type1msg = ntlm.createType1Message(2, config.workstation, config.domain);
    let requestOptions: https.RequestOptions = {
      method: ctx.proxyToServerRequestOptions.method,
      path: ctx.proxyToServerRequestOptions.path,
      host: ctx.proxyToServerRequestOptions.host,
      port: ctx.proxyToServerRequestOptions.port as unknown as string,
      agent: ctx.proxyToServerRequestOptions.agent,
    };
    requestOptions.headers = {};
    requestOptions.headers['authorization'] = type1msg;
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
      let type2msg: any;
      try {
        type2msg = ntlm.decodeType2Message(res.headers['www-authenticate']);
        this._debug.log('Received NTLM message type 2, using NTLMv' + type2msg.version);
        this.debugHeader(res.headers['www-authenticate'], true);
        this.debugHeader(type2msg, false);
      } catch (err) {
        this._debug.log('Cannot parse NTLM message type 2 from host', fullUrl);
        this._debug.log(err);
        context.resetState(ntlmHostUrl);
        return callback(new Error('Cannot parse NTLM message type 2 from host ' + fullUrl));
      }
      let type3msg = ntlm.createType3Message(type2msg, config.username, config.password, config.workstation, config.domain);
      ctx.proxyToServerRequestOptions.headers['authorization'] = type3msg;
      this._debug.log('Sending NTLM message type 3 with initial client request');
      this.debugHeader(type3msg, true);
      context.setState(ntlmHostUrl, NtlmStateEnum.Type3Sent);
      return callback();
    });
    type1req.on('error', (err) => {
      this._debug.log('Error while sending NTLM message type 1:', err);
      context.resetState(ntlmHostUrl);
      return callback(err);
    });
    this._debug.log('Sending  NTLM message type 1');
    this.debugHeader(type1msg, true);
    context.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);
    type1req.end();
  }

  ntlmHandshakeResponse(ctx: IContext, ntlmHostUrl: CompleteUrl, context: IConnectionContext, callback: (error?: NodeJS.ErrnoException) => void) {
    let authState = context.getState(ntlmHostUrl);
    if (authState === NtlmStateEnum.NotAuthenticated) {
      // NTLM auth failed (host may not support NTLM), just pass it through
      return callback();
    }
    if (authState === NtlmStateEnum.Type3Sent) {
      if (ctx.serverToProxyResponse.statusCode === 401) {
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

  private canHandleNtlmAuthentication(res: http.IncomingMessage): boolean {
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
