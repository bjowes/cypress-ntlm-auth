import { Socket } from 'net';
import { CompleteUrl } from '../models/complete.url.model';
import { injectable, interfaces, inject } from 'inversify';
import http from 'http';
import https from 'https';
import { IConfigController } from './interfaces/i.config.controller';
import { IConnectionContextManager } from './interfaces/i.connection.context.manager';
import { IConnectionContext } from './interfaces/i.connection.context';
import { IUpstreamProxyManager } from './interfaces/i.upstream.proxy.manager';
import { TYPES } from './dependency.injection.types';
import { IDebugLogger } from '../util/interfaces/i.debug.logger';
const HttpProxyAgent = require('http-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');

interface ConnectionContextHash {
  [ntlmHostUrl: string]: IConnectionContext
};

@injectable()
export class ConnectionContextManager implements IConnectionContextManager {
  private _agentCount: number = 0;
  private _connectionContexts: ConnectionContextHash = {};
  private _upstreamProxyManager: IUpstreamProxyManager;
  private _configController: IConfigController;
  private ConnectionContext: interfaces.Newable<IConnectionContext>;
  private _debug: IDebugLogger;

  constructor(
    @inject(TYPES.IUpstreamProxyManager) upstreamProxyManager: IUpstreamProxyManager,
    @inject(TYPES.IConfigController) configController: IConfigController,
    @inject(TYPES.NewableIConnectionContext) connectionContext: interfaces.Newable<IConnectionContext>,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._upstreamProxyManager = upstreamProxyManager;
    this._configController = configController;
    this.ConnectionContext = connectionContext;
    this._debug = debug;

    this._configController.configApiEvent.addListener('configUpdate',
      (ntlmHostUrl: CompleteUrl) => this.clearAuthentication(ntlmHostUrl));
  }

  private getClientAddress(clientSocket: Socket): string {
    return clientSocket.remoteAddress + ':' + clientSocket.remotePort;
  }

  getConnectionContextFromClientSocket(clientSocket: Socket, isSSL: boolean, targetHost: CompleteUrl): IConnectionContext {
    let clientAddress = this.getClientAddress(clientSocket);
    if (clientAddress in this._connectionContexts) {
      return this._connectionContexts[clientAddress];
    }

    let agent = this.getAgent(isSSL, targetHost, true);
    agent._cyAgentId = this._agentCount++;
    let context = new this.ConnectionContext();
    context.agent = agent;
    this._connectionContexts[clientAddress] = context;
    clientSocket.on('close', () => this.removeAgent('close', clientAddress));
    clientSocket.on('end', () => this.removeAgent('end', clientAddress));
    this._debug.log('Created NTLM ready agent for client ' + clientAddress + ' to target ' + targetHost.href);
    return context;
  }

  getNonNtlmAgent(isSSL: boolean, targetHost: CompleteUrl): any {
    let agent = this.getAgent(isSSL, targetHost, false);
    agent._cyAgentId = this._agentCount;
    this._agentCount++;
    this._debug.log('Created non-NTLM agent for target ' + targetHost.href);
    return agent;
  }

  private nodeTlsRejectUnauthorized(): boolean {
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
      return process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0';
    }
    return true;
  }

  getAgent(isSSL: boolean, targetHost: CompleteUrl, useNtlm: boolean) {
    let agentOptions: https.AgentOptions = {
      keepAlive: useNtlm,
      rejectUnauthorized: this.nodeTlsRejectUnauthorized() && !targetHost.isLocalhost // Allow self-signed certificates if target is on localhost
    };
    if (useNtlm) {
      // Only one connection per peer -> 1:1 match between inbound and outbound socket
      agentOptions.maxSockets = 1;
    }
    let useUpstreamProxy = this._upstreamProxyManager
      .setUpstreamProxyConfig(targetHost, isSSL, agentOptions);
    let agent;
    if (useUpstreamProxy) {
      agent = isSSL ?
        new HttpsProxyAgent(agentOptions) :
        new HttpProxyAgent(agentOptions);
    } else {
      agent = isSSL ?
        new https.Agent(agentOptions) :
        new http.Agent(agentOptions);
    }
    return agent;
  }

  clearAuthentication(ntlmHostUrl: CompleteUrl) {
    for (var property in this._connectionContexts) {
      if (Object.hasOwnProperty(property)) { // TODO - is this right with Object ?
        this._connectionContexts[property].resetState(ntlmHostUrl);
      }
    }
  }

  removeAllConnectionContexts(event: string) {
    for (var property in this._connectionContexts) {
      if (Object.hasOwnProperty(property)) { // TODO is this right?
        if (this._connectionContexts[property].agent.destroy) {
          this._connectionContexts[property].agent.destroy(); // Destroys any sockets to servers
        }
      }
    }
    this._connectionContexts = {};
    this._debug.log('Removed all agents due to ' + event);
  }

  removeAgent(event: string, clientAddress: string) {
    if (clientAddress in this._connectionContexts) {
      if (this._connectionContexts[clientAddress].agent.destroy) {
        this._connectionContexts[clientAddress].agent.destroy(); // Destroys any sockets to servers
      }
      delete this._connectionContexts[clientAddress];
      this._debug.log('Removed agent for ' + clientAddress + ' due to socket.' + event);
    } else {
      this._debug.log('RemoveAgent called but agent does not exist (socket.' + event + ' for ' + clientAddress);
    }
  }

};
