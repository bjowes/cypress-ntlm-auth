import { Socket } from "net";
import { injectable, interfaces, inject } from "inversify";
import http from "http";
import https from "https";
import { IConnectionContextManager } from "./interfaces/i.connection.context.manager";
import { IConnectionContext } from "./interfaces/i.connection.context";
import { IUpstreamProxyManager } from "./interfaces/i.upstream.proxy.manager";
import { TYPES } from "./dependency.injection.types";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { SslTunnel } from "../models/ssl.tunnel.model";
import { httpsTunnel, TunnelAgent, TunnelAgentOptions } from "./tunnel.agent";
import { IHttpsValidation } from "./interfaces/i.https.validation";
import { ExtendedAgentOptions } from "../models/extended.agent.options";

interface ConnectionContextHash {
  [ntlmHostUrl: string]: IConnectionContext;
}

interface SslTunnelHash {
  [ntlmHostUrl: string]: SslTunnel;
}

/**
 * Connection context manager
 */
@injectable()
export class ConnectionContextManager implements IConnectionContextManager {
  private _connectionContexts: ConnectionContextHash = {};
  private _upstreamProxyManager: IUpstreamProxyManager;
  private ConnectionContext: interfaces.Newable<IConnectionContext>;
  private _httpsValidation: IHttpsValidation;
  private _debug: IDebugLogger;
  private _tunnels: SslTunnelHash = {};

  /**
   * Constructor
   * @param upstreamProxyManager Upstream proxy manager
   * @param connectionContext Connection context factory
   * @param httpsValidation HTTP validator
   * @param debug Debug logger
   */
  constructor(
    @inject(TYPES.IUpstreamProxyManager)
    upstreamProxyManager: IUpstreamProxyManager,
    @inject(TYPES.NewableIConnectionContext)
    connectionContext: interfaces.Newable<IConnectionContext>,
    @inject(TYPES.IHttpsValidation) httpsValidation: IHttpsValidation,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger
  ) {
    this._upstreamProxyManager = upstreamProxyManager;
    this.ConnectionContext = connectionContext;
    this._httpsValidation = httpsValidation;
    this._debug = debug;
  }

  private getClientAddress(clientSocket: Socket): string {
    return clientSocket.remoteAddress + ":" + clientSocket.remotePort;
  }

  /**
   * Create a connection context
   * @param clientSocket request client socket
   * @param isSSL is SSL connection
   * @param targetHost Target Url
   * @returns Connection context
   */
  createConnectionContext(
    clientSocket: Socket,
    isSSL: boolean,
    targetHost: URL
  ): IConnectionContext {
    const clientAddress = this.getClientAddress(clientSocket);
    if (clientAddress in this._connectionContexts) {
      return this._connectionContexts[clientAddress];
    }

    const useUpstreamProxy =
      this._upstreamProxyManager.hasHttpsUpstreamProxy(targetHost);
    const agent = this.getAgent(isSSL, targetHost, useUpstreamProxy);
    const context = new this.ConnectionContext();
    context.clientAddress = clientAddress;
    context.agent = agent;
    context.clientSocket = clientSocket;
    context.useUpstreamProxy = useUpstreamProxy;
    context.isSSL = isSSL;

    this._connectionContexts[clientAddress] = context;
    context.socketCloseListener = this.removeAgentOnClose.bind(
      this,
      clientAddress
    );
    clientSocket.once("close", context.socketCloseListener);
    this._debug.log(
      "Created agent for client " +
        clientAddress +
        " to target " +
        targetHost.href
    );
    return context;
  }

  private removeAgentOnClose(clientAddress: string) {
    this.removeAgent("close", clientAddress);
  }

  /**
   * Get connection context from request client socket
   * @param clientSocket request client socket
   * @returns Connection context if one exists
   */
  getConnectionContextFromClientSocket(
    clientSocket: Socket
  ): IConnectionContext | undefined {
    const clientAddress = this.getClientAddress(clientSocket);
    if (clientAddress in this._connectionContexts) {
      return this._connectionContexts[clientAddress];
    }
    return undefined;
  }

  /**
   * Create request agent
   * @param isSSL is SSL connection 
   * @param targetHost Target Url
   * @param useUpstreamProxy is upstream proxy required
   * @returns agent
   */
  getAgent(isSSL: boolean, targetHost: URL, useUpstreamProxy: boolean) 
  : TunnelAgent | http.Agent | https.Agent {
    const agentOptions: ExtendedAgentOptions = {
      keepAlive: true,
      maxSockets: 1, // Only one connection per peer -> 1:1 match between inbound and outbound socket
      rejectUnauthorized: this._httpsValidation.useRequestHttpsValidation(),
    };
    if (useUpstreamProxy) {
      this._upstreamProxyManager.setUpstreamProxyConfig(
        targetHost,
        isSSL,
        agentOptions
      );
    }
    let agent: TunnelAgent | http.Agent | https.Agent;
    if (useUpstreamProxy && isSSL) {
      agent = httpsTunnel(agentOptions as TunnelAgentOptions);
    } else {
      agent = isSSL
        ? new https.Agent(agentOptions)
        : new http.Agent(agentOptions);
    }
    return agent;
  }

  /**
   * Create untracked agent.
   * Untracked agents are used for requests to the config API.
   * These should not be destroyed on reset since that breaks the config API response.
   * @param targetHost Target Url
   * @returns untracked http agent
   */
  getUntrackedAgent(targetHost: URL) : http.Agent {
    const agent = new http.Agent();
    this._debug.log("Created untracked agent for target " + targetHost.href);
    return agent;
  }

  /**
   * Remove all connection contexts
   * @param event Event name that triggered the removal
   */
  removeAllConnectionContexts(event: string) {
    const preservedContexts: ConnectionContextHash = {};
    for (const property in this._connectionContexts) {
      if (Object.prototype.hasOwnProperty.call(this._connectionContexts, property)) {
        const context = this._connectionContexts[property];
        if (context.configApiConnection) {
          // Must let config api context stay alive, otherwise there is no response to a reset or quit call
          preservedContexts[context.clientAddress] = context;
        } else {
          context.clientSocket?.removeListener(
            "close",
            context.socketCloseListener!
          );
          this._debug.log("Destroying context for", context.clientAddress);
          context.destroy(event);
        }
      }
    }
    this._connectionContexts = preservedContexts;
    this._debug.log("Removed all agents due to " + event);
  }

  /**
   * Remove an agent for a request client address
   * @param event Event name that triggered the remove
   * @param clientAddress request client address
   */
  removeAgent(event: string, clientAddress: string) {
    if (clientAddress in this._connectionContexts) {
      this._connectionContexts[clientAddress].clientSocket?.removeListener(
        "close",
        this._connectionContexts[clientAddress].socketCloseListener!
      );
      this._connectionContexts[clientAddress].destroy(event);
      delete this._connectionContexts[clientAddress];
      this._debug.log(
        "Removed agent for " + clientAddress + " due to socket." + event
      );
    }
  }

  /**
   * Add a tunnel to tracking
   * @param client request client socket
   * @param target target socket
   */
  addTunnel(client: Socket, target: Socket) {
    this._tunnels[this.getClientAddress(client)] = {
      client: client,
      target: target,
    };
  }

  /**
   * Remove a tunnel from tracking
   * @param client request client socket
   */
  removeTunnel(client: Socket) {
    const clientAddress = this.getClientAddress(client);
    if (clientAddress in this._tunnels) {
      delete this._tunnels[clientAddress];
    }
  }

  /**
   * Remove and close all tunnels
   * @param event event name that triggered the remove
   */
  removeAndCloseAllTunnels(event: string) {
    for (const property in this._tunnels) {
      if (Object.prototype.hasOwnProperty.call(this._tunnels, property)) {
        if (this._tunnels[property].target) {
          this._tunnels[property].target.end();
        }
      }
    }
    this._tunnels = {};
    this._debug.log("Removed and closed all tunnels due to " + event);
  }

  /**
   * Reset HTTPS validation cache
   */
  resetHttpsValidation() {
    this._httpsValidation.reset();
  }
}
