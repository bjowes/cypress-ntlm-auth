import { IContext } from 'http-mitm-proxy';

import net from 'net';
import http from 'http';
import { toCompleteUrl } from '../util/url.converter';
import { debug } from '../util/debug';
import { ConnectionContextManager } from './connection.context.manager';
import { CompleteUrl } from '../models/complete.url.model';
import { injectable } from 'inversify';
import { ConfigServer } from './config.server';
import { ConfigStore } from './config.store';
import { NtlmManager } from './ntlm.manager';
import { UpstreamProxyManager } from './upstream.proxy.manager';

@injectable()
export class NtlmProxyMitm {
  private readonly _configStore: ConfigStore;
  private readonly _configServer: ConfigServer;
  private readonly _connectionContextManager: ConnectionContextManager;
  private readonly _ntlmManager: NtlmManager;
  private readonly _upstreamProxyManager: UpstreamProxyManager;

  constructor(configStore: ConfigStore, configServer: ConfigServer, connectionContextManager: ConnectionContextManager, ntlmManager: NtlmManager, upstreamProxyManager: UpstreamProxyManager) {
    this._configStore = configStore;
    this._configServer = configServer;
    this._connectionContextManager = connectionContextManager;
    this._ntlmManager = ntlmManager;
    this._upstreamProxyManager = upstreamProxyManager;
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
    if (this.filterChromeStartup(ctx, error.code, errorKind)) {
      return;
    }
    var url = (ctx && ctx.clientToProxyRequest) ? ctx.clientToProxyRequest.url : '';
    debug(errorKind + ' on ' + url + ':', error);
  }

  private filterConfigApiRequestLogging(targetHost: CompleteUrl) {
    return (targetHost.href === this._configServer.configApiUrl);
  }

  onRequest(ctx: IContext, callback: (error?: NodeJS.ErrnoException) => void) {
    let targetHost = this.getTargetHost(ctx);
    if (targetHost) {
      if (this._configStore.exists(targetHost)) {
        debug('Request to ' + targetHost + ' in registered NTLM Hosts');
        let context = this._connectionContextManager
          .getConnectionContextFromClientSocket(ctx.clientToProxyRequest.socket, ctx.isSSL, targetHost);
        ctx.proxyToServerRequestOptions.agent = context.agent;
        if (context.isAuthenticated(targetHost)) {
          return callback();
        }

        this._ntlmManager.ntlmHandshake(ctx, targetHost, context, (err?: NodeJS.ErrnoException) => {
          if (err) {
            debug('Cannot perform NTLM handshake. Let original message pass through');
          }
          return callback();
        });
      } else {
        if (!this.filterConfigApiRequestLogging(targetHost)) {
          debug('Request to ' + targetHost + ' - pass on');
        }
        ctx.proxyToServerRequestOptions.agent =
          this._connectionContextManager.getNonNtlmAgent(ctx.isSSL, targetHost);
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
    return toCompleteUrl(host, ctx.isSSL);
  }

  onResponse(ctx: IContext, callback: (error?: NodeJS.ErrnoException) => void) {
    let targetHost = this.getTargetHost(ctx);
    if (!targetHost || !(this._configStore.exists(targetHost))) {
      return callback();
    }

    let context = this._connectionContextManager
      .getConnectionContextFromClientSocket(ctx.clientToProxyRequest.socket, ctx.isSSL, targetHost);

    if (context.isAuthenticated(targetHost)) {
      return callback();
    }

    this._ntlmManager.ntlmHandshakeResponse(ctx, targetHost, context, callback);
  }

  onConnect(req: http.IncomingMessage, socket: net.Socket, head: any, callback: (error?: NodeJS.ErrnoException) => void) {
    if (!req.url) {
      debug('Invalid connect request - cannot read target url');
      return callback();
    }

    let targetHost = toCompleteUrl(req.url, true);
    if (this._configStore.exists(targetHost)) {
      return callback();
    }

    if (this._upstreamProxyManager.hasHttpsUpstreamProxy()) {
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
