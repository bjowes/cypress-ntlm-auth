import { IContext } from 'http-mitm-proxy';
import { injectable } from 'inversify';
import http from 'http';
import https from 'https';
import { ConnectionContext } from './connection.context';
import { NtlmStateEnum } from '../models/ntlm.state.enum';
import { debug } from '../util/debug';
import { CompleteUrl } from '../models/complete.url.model';
import { ConfigStore } from './config.store';

const ntlm = require('httpntlm').ntlm;

@injectable()
export class NtlmManager {
  private _configStore: ConfigStore;

  constructor(configStore: ConfigStore) {
    this._configStore = configStore;
  }

  ntlmHandshake(ctx: IContext, ntlmHostUrl: CompleteUrl, context: ConnectionContext, callback: (error?: NodeJS.ErrnoException) => void) {
    let fullUrl = ntlmHostUrl.href + ntlmHostUrl.path;
    context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
    let config = this._configStore.get(ntlmHostUrl)
    let ntlmOptions = {
      username: config.username,
      password: config.password,
      domain: config.domain,
      workstation: config.workstation,
      url: fullUrl
    };
    let type1msg = ntlm.createType1Message(ntlmOptions);
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
        debug('www-authenticate not found on response of second request during NTLM handshake with host', fullUrl);
        context.resetState(ntlmHostUrl);
        return callback(new Error('www-authenticate not found on response of second request during NTLM handshake with host ' + fullUrl));
      }

      debug('received NTLM message type 2');
      context.setState(ntlmHostUrl, NtlmStateEnum.Type2Received);
      let type2msg = ntlm.parseType2Message(res.headers['www-authenticate'], (err: Error) => {
        if (err) {
          debug('Cannot parse NTLM message type 2 from host', fullUrl);
          context.resetState(ntlmHostUrl);
          return callback(new Error('Cannot parse NTLM message type 2 from host ' + fullUrl));
        }
      });
      if (!type2msg) {
        // Let the error callback from parseType2Message process this
        return;
      }
      let type3msg = ntlm.createType3Message(type2msg, ntlmOptions);
      ctx.proxyToServerRequestOptions.headers['authorization'] = type3msg;
      debug('Sending NTLM message type 3 with initial client request');
      context.setState(ntlmHostUrl, NtlmStateEnum.Type3Sent);
      return callback();
    });
    type1req.on('error', (err) => {
      debug('Error while sending NTLM message type 1:', err);
      context.resetState(ntlmHostUrl);
      return callback(err);
    });
    debug('Sending  NTLM message type 1');
    context.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);
    type1req.end();
  }


  ntlmHandshakeResponse(ctx: IContext, ntlmHostUrl: CompleteUrl, context: ConnectionContext, callback: (error?: NodeJS.ErrnoException) => void) {
    let authState = context.getState(ntlmHostUrl);
    if (authState === NtlmStateEnum.NotAuthenticated) {
      // NTLM auth failed (host may not support NTLM), just pass it through
      return callback();
    }
    if (authState === NtlmStateEnum.Type3Sent) {
      if (ctx.serverToProxyResponse.statusCode === 401) {
        debug('NTLM authentication failed, invalid credentials.');
        context.resetState(ntlmHostUrl);
        return callback();
      }
      // According to NTLM spec, all other responses than 401 shall be treated as authentication successful
      debug('NTLM authentication successful for host', ntlmHostUrl);
      context.setState(ntlmHostUrl, NtlmStateEnum.Authenticated);
      return callback();
    }

    debug('Response from server in unexpected NTLM state ' + authState + ', resetting NTLM auth.');
    context.resetState(ntlmHostUrl);
    return callback();

  }

  private canHandleNtlmAuthentication(res: http.IncomingMessage): boolean {
    if (res && res.statusCode === 401) {
        // Ensure that we're talking NTLM here
        // Once we have the www-authenticate header, split it so we can ensure we can talk NTLM
        const wwwAuthenticate = res.headers['www-authenticate'];

        if (wwwAuthenticate) {
            const mechanisms = wwwAuthenticate.split(', ');
            const index = mechanisms.indexOf("NTLM");
            if (index >= 0) {
                return true;
            }
        }
    }

    return false;
}

};
