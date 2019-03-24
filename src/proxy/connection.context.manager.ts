import { Socket } from 'net';
import { ConnectionContext } from './connection.context';
import { CompleteUrl } from '../models/complete.url.model';
import { debug } from '../util/debug';
import { injectable } from 'inversify';
import { UpstreamProxyManager } from './upstream.proxy.manager';
import http from 'http';
import https from 'https';
import { ConfigController } from './config.controller';
const HttpProxyAgent = require('http-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');

interface ConnectionContextHash {
  [ntlmHostUrl: string]: ConnectionContext
};

@injectable()
export class ConnectionContextManager {
  private _agentCount: number = 0;
  private _connectionContexts: ConnectionContextHash = {};

  constructor(private _upstreamProxyManager: UpstreamProxyManager,
  private _configController: ConfigController) {
    this._configController.configApiEvent.addListener('configUpdate',
      (ntlmHostUrl: CompleteUrl) => this.clearAuthentication(ntlmHostUrl));
  }

  private getClientAddress(clientSocket: Socket): string {
    return clientSocket.remoteAddress + ':' + clientSocket.remotePort;
  }

  getConnectionContextFromClientSocket(clientSocket: Socket, isSSL: boolean, targetHost: CompleteUrl): ConnectionContext {
    let clientAddress = this.getClientAddress(clientSocket);
    if (clientAddress in this._connectionContexts) {
      return this._connectionContexts[clientAddress];
    }

    let agent = this.getAgent(isSSL, targetHost, true);
    agent._cyAgentId = this._agentCount++;
    let context = new ConnectionContext(agent);
    this._connectionContexts[clientAddress] = context;
    clientSocket.on('close', () => this.removeAgent('close', clientAddress));
    clientSocket.on('end', () => this.removeAgent('end', clientAddress));
    debug('Created NTLM ready agent for client ' + clientAddress + ' to target ' + targetHost);
    return context;
  }

  getNonNtlmAgent(isSSL: boolean, targetHost: CompleteUrl): any {
    let agent = this.getAgent(isSSL, targetHost, false);
    agent._cyAgentId = this._agentCount;
    this._agentCount++;
    debug('Created non-NTLM agent for target ' + targetHost);
    return agent;
  }

  private isLocalhost(hostUrl: CompleteUrl) {
    return (hostUrl.hostname === 'localhost' || hostUrl.hostname === '127.0.0.1');
  }

  getAgent(isSSL: boolean, targetHost: CompleteUrl, useNtlm: boolean) {
    let agentOptions: https.AgentOptions = {
      keepAlive: useNtlm,
      rejectUnauthorized: !this.isLocalhost(targetHost) // Allow self-signed certificates if target is on localhost
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
    debug('Removed all agents due to ' + event);
  }

  removeAgent(event: string, clientAddress: string) {
    if (clientAddress in this._connectionContexts) {
      if (this._connectionContexts[clientAddress].agent.destroy) {
        this._connectionContexts[clientAddress].agent.destroy(); // Destroys any sockets to servers
      }
      delete this._connectionContexts[clientAddress];
      debug('Removed agent for ' + clientAddress + ' due to socket.' + event);
    } else {
      debug('RemoveAgent called but agent does not exist (socket.' + event + ' for ' + clientAddress);
    }
  }

};
