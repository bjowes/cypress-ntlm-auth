import { IContext } from 'http-mitm-proxy';

import net from 'net';
import http from 'http';
import { toCompleteUrl } from '../util/url.converter';
import { debug } from '../util/debug';
import { CompleteUrl } from '../models/complete.url.model';
import { injectable, inject } from 'inversify';
import { IConfigServer } from './interfaces/i.config.server';
import { IConfigStore } from './interfaces/i.config.store';
import { IConnectionContextManager } from './interfaces/i.connection.context.manager';
import { INtlmProxyMitm } from './interfaces/i.ntlm.proxy.mitm';
import { INtlmManager } from './interfaces/i.ntlm.manager';
import { IUpstreamProxyManager } from './interfaces/i.upstream.proxy.manager';
import { TYPES } from './dependency.injection.types';

let self: NtlmProxyMitm;

@injectable()
export class NtlmProxyMitm implements INtlmProxyMitm {
  private _configStore: IConfigStore;
  private _configServer: IConfigServer;
  private _connectionContextManager: IConnectionContextManager;
  private _ntlmManager: INtlmManager;
  private _upstreamProxyManager: IUpstreamProxyManager;

  constructor(@inject(TYPES.IConfigStore) configStore: IConfigStore,
    @inject(TYPES.IConfigServer) configServer: IConfigServer,
    @inject(TYPES.IConnectionContextManager) connectionContextManager: IConnectionContextManager,
    @inject(TYPES.INtlmManager) ntlmManager: INtlmManager,
    @inject(TYPES.IUpstreamProxyManager) upstreamProxyManager: IUpstreamProxyManager) {
      this._configStore = configStore;
      this._configServer = configServer;
      this._connectionContextManager = connectionContextManager;
      this._ntlmManager = ntlmManager;
      this._upstreamProxyManager = upstreamProxyManager;

    // Keep track of instance since methods will be triggered from HttpMitmProxy
    // events which means that 'this' is no longer the class instance
    self = this;
  }

  private filterChromeStartup(ctx: IContext, errno: string | undefined, errorKind: string) {
    if (!ctx || !ctx.clientToProxyRequest || !errno) {
      return false;
    }
    let req = ctx.clientToProxyRequest;
    if (req.method === 'HEAD' &&
        req.url === '/' &&
        req.headers.host &&
        req.headers.host.indexOf('.') === -1 &&
        req.headers.host.indexOf(':') === -1 &&
        req.headers.host.indexOf('/') === -1 &&
        errorKind === 'PROXY_TO_SERVER_REQUEST_ERROR' &&
        errno === 'ENOTFOUND') {
      debug('Chrome startup HEAD request detected (host: ' + req.headers.host + '). Ignoring connection error.');
      return true;
    }
  }

  onError(ctx: IContext, error: NodeJS.ErrnoException, errorKind: string) {
    if (self.filterChromeStartup(ctx, error.code, errorKind)) {
      return;
    }
    var url = (ctx && ctx.clientToProxyRequest) ? ctx.clientToProxyRequest.url : '';
    debug(errorKind + ' on ' + url + ':', error);
  }

  private filterConfigApiRequestLogging(targetHost: CompleteUrl) {
    return (targetHost.href === self._configServer.configApiUrl);
  }

  onRequest(ctx: IContext, callback: (error?: NodeJS.ErrnoException) => void) {
    let targetHost = self.getTargetHost(ctx);
    if (targetHost) {
      if (self._configStore.exists(targetHost)) {
        debug('Request to ' + targetHost.href + ' in registered NTLM Hosts');
        let context = self._connectionContextManager
          .getConnectionContextFromClientSocket(ctx.clientToProxyRequest.socket, ctx.isSSL, targetHost);
        ctx.proxyToServerRequestOptions.agent = context.agent;
        if (context.isAuthenticated(targetHost)) {
          return callback();
        }

        self._ntlmManager.ntlmHandshake(ctx, targetHost, context, (err?: NodeJS.ErrnoException) => {
          if (err) {
            debug('Cannot perform NTLM handshake. Let original message pass through');
          }
          return callback();
        });
      } else {
        if (!self.filterConfigApiRequestLogging(targetHost)) {
          debug('Request to ' + targetHost.href + ' - pass on');
        }
        ctx.proxyToServerRequestOptions.agent =
          self._connectionContextManager.getNonNtlmAgent(ctx.isSSL, targetHost);
        return callback();
      }
    } else {
      return callback();
    }
  }


  private getTargetHost(ctx: IContext): CompleteUrl | undefined {
    if (!ctx.clientToProxyRequest.headers.host) {
      debug('Invalid request - Could not read "host" header from incoming request to proxy');
      return undefined;
    }
    let host = ctx.clientToProxyRequest.headers.host;
    return toCompleteUrl(host, ctx.isSSL, true);
  }

  onResponse(ctx: IContext, callback: (error?: NodeJS.ErrnoException) => void) {
    let targetHost = self.getTargetHost(ctx);
    if (!targetHost || !(self._configStore.exists(targetHost))) {
      return callback();
    }

    let context = self._connectionContextManager
      .getConnectionContextFromClientSocket(ctx.clientToProxyRequest.socket, ctx.isSSL, targetHost);

    if (context.isAuthenticated(targetHost)) {
      return callback();
    }

    self._ntlmManager.ntlmHandshakeResponse(ctx, targetHost, context, callback);
  }

  onConnect(req: http.IncomingMessage, socket: net.Socket, head: any, callback: (error?: NodeJS.ErrnoException) => void) {
    if (!req.url) {
      debug('Invalid connect request - cannot read target url');
      return callback();
    }

    let targetHost = toCompleteUrl(req.url, true, true);
    if (self._configStore.exists(targetHost)) {
      return callback();
    }

    if (self._upstreamProxyManager.hasHttpsUpstreamProxy(targetHost)) {
      // Don't tunnel if we need to go through an upstream proxy
      return callback();
    }

    // Let non-NTLM hosts tunnel through
    debug('Tunnel to', req.url);
    var conn = net.connect({
      port: +targetHost.port,
      host: targetHost.hostname,
      allowHalfOpen: true
    }, function () {
      conn.on('finish', () => {
        socket.destroy();
      });

      socket.write('HTTP/1.1 200 OK\r\n\r\n', 'UTF-8', function () {
        conn.write(head);
        conn.pipe(socket);
        socket.pipe(conn);
      });
    });

    conn.on('error', function(err: NodeJS.ErrnoException) {
      filterSocketConnReset(err, 'PROXY_TO_SERVER_SOCKET');
    });
    socket.on('error', function(err: NodeJS.ErrnoException) {
      filterSocketConnReset(err, 'CLIENT_TO_PROXY_SOCKET');
    });

    // Since node 0.9.9, ECONNRESET on sockets are no longer hidden
    function filterSocketConnReset(err: NodeJS.ErrnoException, socketDescription: string) {
      if (err.code === 'ECONNRESET') {
        debug('Got ECONNRESET on ' + socketDescription + ', ignoring.');
      } else {
        debug('Got unexpected error on ' + socketDescription, err);
      }
    }
  }


}
