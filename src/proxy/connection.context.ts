import { NtlmStateEnum } from "../models/ntlm.state.enum";
import { injectable } from "inversify";
import { IConnectionContext } from "./interfaces/i.connection.context";
import { PeerCertificate } from "tls";
import { IWinSsoFacade } from "./interfaces/i.win-sso.facade";
import { Socket } from "net";
import { TunnelAgent } from "./tunnel.agent";
import http from "http";
import https from "https";

/**
 * Connection context
 */
@injectable()
export class ConnectionContext implements IConnectionContext {
  private _agent!: TunnelAgent | http.Agent | https.Agent;
  private _ntlmHost?: URL;
  private _ntlmState: NtlmStateEnum = NtlmStateEnum.NotAuthenticated;
  private _requestBody = Buffer.alloc(0);
  private _winSso?: IWinSsoFacade;
  private _peerCert?: PeerCertificate;
  private _clientAddress = "";
  private _clientSocket?: Socket;
  private _socketCloseListener?: () => void;
  private _configApiConnection = false;
  private _useUpstreamProxy = false;
  private _isSSL = false;

  /**
   * Get agent
   * @returns agent
   */
  get agent(): TunnelAgent | http.Agent | https.Agent {
    return this._agent;
  }
  /**
   * Set agent
   */
  set agent(agent: TunnelAgent | http.Agent | https.Agent) {
    this._agent = agent;
  }

  /**
   * Get Win SSO facade
   * @returns Win SSO facade
   */
  get winSso(): IWinSsoFacade {
    if (!this._winSso) {
      throw new Error("WinSso not initialized for context");
    }
    return this._winSso;
  }
  /**
   * Set Win SSO facade
   */
  set winSso(winSso: IWinSsoFacade) {
    this._winSso = winSso;
  }

  /**
   * Get Peer certificate
   * @returns Peer certificate
   */
  get peerCert(): PeerCertificate | undefined {
    return this._peerCert;
  }
  /**
   * Set Peer certificate
   */
  set peerCert(peerCert: PeerCertificate | undefined) {
    this._peerCert = peerCert;
  }

  /**
   * Get request client address
   * @returns request client address
   */
  get clientAddress(): string {
    return this._clientAddress;
  }
  /**
   * Set request client address
   */
  set clientAddress(clientAddress: string) {
    this._clientAddress = clientAddress;
  }

  /**
   * Get request client socket
   * @returns request client socket
   */
  get clientSocket(): Socket | undefined {
    return this._clientSocket;
  }
  /**
   * Set request client socket
   */
  set clientSocket(clientSocket: Socket | undefined) {
    this._clientSocket = clientSocket;
  }

  /**
   * Get socket close listener
   * @returns socket close listener
   */
  get socketCloseListener(): (() => void) | undefined {
    return this._socketCloseListener;
  }
  /**
   * Set socket close listener
   */
  set socketCloseListener(listener: (() => void)) {
    this._socketCloseListener = listener;
  }

  /**
   * Get is this a config API connection
   * @returns true if this is a config API connection
   */
  get configApiConnection(): boolean {
    return this._configApiConnection;
  }
  /**
   * Set is this a config API connection
   */
  set configApiConnection(val: boolean) {
    this._configApiConnection = val;
  }

  /**
   * Get use upstream proxy
   * @returns true if upstream proxy is required
   */
  get useUpstreamProxy(): boolean {
    return this._useUpstreamProxy;
  }
  /**
   * Set use upstream proxy
   */
  set useUpstreamProxy(val: boolean) {
    this._useUpstreamProxy = val;
  }

  /**
   * Get is SSL connection
   * @returns true if SSL connection
   */
  get isSSL(): boolean {
    return this._isSSL;
  }
  /**
   * Set is SSL connection
   */
  set isSSL(val: boolean) {
    this._isSSL = val;
  }

  /**
   * If the connection is new or a handshake has been completed (successful or failed),
   * a new handshake can be initiated
   * @param ntlmHostUrl The target url
   * @returns True if the connection is new or a handshake has been completed
   */
  canStartAuthHandshake(ntlmHostUrl: URL): boolean {
    const auth =
      this._ntlmHost === undefined ||
      (this._ntlmHost.href === ntlmHostUrl.href &&
        (this._ntlmState === NtlmStateEnum.Authenticated || this._ntlmState === NtlmStateEnum.NotAuthenticated));
    return auth;
  }

  /**
   * Check if a target host matches this connection context host, or if the connection context is new
   * @param ntlmHostUrl Target host
   * @param isSSL use SSL
   * @returns true if match or new
   */
  matchHostOrNew(ntlmHostUrl: URL, isSSL: boolean): boolean {
    return this._isSSL == isSSL && (this._ntlmHost === undefined || this._ntlmHost.href === ntlmHostUrl.href);
  }

  /**
   * Get authentication state for a target host
   * @param ntlmHostUrl Target host
   * @returns Authentication state
   */
  getState(ntlmHostUrl: URL): NtlmStateEnum {
    if (this._ntlmHost && ntlmHostUrl.href === this._ntlmHost.href) {
      return this._ntlmState;
    }
    return NtlmStateEnum.NotAuthenticated;
  }

  /**
   * Set authentication state for a target host
   * @param ntlmHostUrl Target host
   * @param authState Authentication state
   */
  setState(ntlmHostUrl: URL, authState: NtlmStateEnum) {
    this._ntlmHost = ntlmHostUrl;
    this._ntlmState = authState;
  }

  /**
   * Clears any stored request body
   */
  clearRequestBody() {
    this._requestBody = Buffer.alloc(0);
  }

  /**
   * Add a chunk of data to the stored request body
   * @param chunk Chunk of data
   */
  addToRequestBody(chunk: Buffer) {
    this._requestBody = Buffer.concat([this._requestBody, chunk]);
  }

  /**
   * Get stored request body
   * @returns request body buffer
   */
  getRequestBody(): Buffer {
    return this._requestBody;
  }

  /**
   * Destory connection context, including agent, client socket and Win SSO
   * @param event Event name that triggered the destory
   */
  destroy(event: string) {
    if (this._agent.destroy) {
      this._agent.destroy(); // Destroys any sockets to servers
    }
    if (this._clientSocket && event !== "reuse") {
      this._clientSocket.destroy();
    }
    if (this._winSso) {
      this._winSso.freeAuthContext();
    }
  }
}
