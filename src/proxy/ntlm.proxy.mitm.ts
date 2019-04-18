import { IContext } from 'http-mitm-proxy';

import net from 'net';
import http from 'http';
import url from 'url';
import { toCompleteUrl } from '../util/url.converter';
import { CompleteUrl } from '../models/complete.url.model';
import { injectable, inject } from 'inversify';
import { IConfigServer } from './interfaces/i.config.server';
import { IConfigStore } from './interfaces/i.config.store';
import { IConnectionContextManager } from './interfaces/i.connection.context.manager';
import { INtlmProxyMitm } from './interfaces/i.ntlm.proxy.mitm';
import { INtlmManager } from './interfaces/i.ntlm.manager';
import { IUpstreamProxyManager } from './interfaces/i.upstream.proxy.manager';
import { TYPES } from './dependency.injection.types';
import { IDebugLogger } from '../util/interfaces/i.debug.logger';
import { INtlmProxyServer } from './interfaces/i.ntlm.proxy.server';

let self: NtlmProxyMitm;

@injectable()
export class NtlmProxyMitm implements INtlmProxyMitm {
  private _configStore: IConfigStore;
  private _configServer: IConfigServer;
  private _connectionContextManager: IConnectionContextManager;
  private _ntlmManager: INtlmManager;
  private _upstreamProxyManager: IUpstreamProxyManager;
  private _debug: IDebugLogger;
  private _ntlmProxyPort: string | undefined;

  constructor(
    @inject(TYPES.IConfigStore) configStore: IConfigStore,
    @inject(TYPES.IConfigServer) configServer: IConfigServer,
    @inject(TYPES.IConnectionContextManager) connectionContextManager: IConnectionContextManager,
    @inject(TYPES.INtlmManager) ntlmManager: INtlmManager,
    @inject(TYPES.IUpstreamProxyManager) upstreamProxyManager: IUpstreamProxyManager,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._configStore = configStore;
    this._configServer = configServer;
    this._connectionContextManager = connectionContextManager;
    this._ntlmManager = ntlmManager;
    this._upstreamProxyManager = upstreamProxyManager;
    this._debug = debug;

    // Keep track of instance since methods will be triggered from HttpMitmProxy
    // events which means that 'this' is no longer the class instance
    self = this;
  }

  get NtlmProxyPort(): string {
    if (this._ntlmProxyPort !== undefined) {
      return this._ntlmProxyPort;
    }
    throw new Error('Cannot get ntlmProxyPort, port has not been set!');
  }
  set NtlmProxyPort(port: string) {
    if (port === '') {
      this._ntlmProxyPort = undefined;
    }
    this._ntlmProxyPort = port;
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
      self._debug.log('Chrome startup HEAD request detected (host: ' + req.headers.host + '). Ignoring connection error.');
      return true;
    }
  }

  onError(ctx: IContext, error: NodeJS.ErrnoException, errorKind: string) {
    if (self.filterChromeStartup(ctx, error.code, errorKind)) {
      return;
    }
    var url = (ctx && ctx.clientToProxyRequest) ? ctx.clientToProxyRequest.url : '';
    self._debug.log(errorKind + ' on ' + url + ':', error);
  }

  private filterConfigApiRequestLogging(targetHost: CompleteUrl) {
    return (targetHost.href === self._configServer.configApiUrl);
  }

  onRequest(ctx: IContext, callback: (error?: NodeJS.ErrnoException) => void) {
    let targetHost = self.getTargetHost(ctx);
    if (targetHost) {
      if (self._configStore.exists(targetHost)) {
        self._debug.log('Request to ' + targetHost.href + ' in registered NTLM Hosts');
        let context = self._connectionContextManager
          .getConnectionContextFromClientSocket(ctx.clientToProxyRequest.socket, ctx.isSSL, targetHost);
        ctx.proxyToServerRequestOptions.agent = context.agent;
        if (context.isAuthenticated(targetHost)) {
          return callback();
        }

        self._ntlmManager.ntlmHandshake(ctx, targetHost, context, (err?: NodeJS.ErrnoException) => {
          if (err) {
            self._debug.log('Cannot perform NTLM handshake. Let original message pass through');
          }
          return callback();
        });
      } else {
        if (!self.filterConfigApiRequestLogging(targetHost)) {
          self._debug.log('Request to ' + targetHost.href + ' - pass on');
        }
        ctx.proxyToServerRequestOptions.agent =
          self._connectionContextManager.getNonNtlmAgent(ctx.isSSL, targetHost);
        return callback();
      }
    } else {
      // The http-mitm-proxy cannot handle this scenario, if no target host header
      // is set it will get stuck in an infinite loop
      return callback(new Error('Invalid request - Could not read "host" header or "host" header refers to this proxy'));
    }
  }

  private isNtlmProxyAddress(hostUrl: CompleteUrl): boolean {
    return hostUrl.isLocalhost && hostUrl.port === self.NtlmProxyPort;
  }

  private getTargetHost(ctx: IContext): CompleteUrl | null {
    if (!ctx.clientToProxyRequest.headers.host) {
      self._debug.log('Invalid request - Could not read "host" header from incoming request to proxy');
      return null;
    }
    let host = ctx.clientToProxyRequest.headers.host;
    let hostUrl = toCompleteUrl(host, ctx.isSSL, true);
    if (self.isNtlmProxyAddress(hostUrl)) {
      self._debug.log('Invalid request - host header refers to this proxy');
      return null;
    }
    return hostUrl;
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
      self._debug.log('Invalid connect request - cannot read target url');
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
    self._debug.log('Tunnel to', req.url);
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
        self._debug.log('Got ECONNRESET on ' + socketDescription + ', ignoring.');
      } else {
        self._debug.log('Got unexpected error on ' + socketDescription, err);
      }
    }
  }


}
