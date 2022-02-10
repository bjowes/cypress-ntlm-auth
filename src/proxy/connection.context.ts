import { NtlmStateEnum } from "../models/ntlm.state.enum.js";
import { injectable } from "inversify";
import { IConnectionContext } from "./interfaces/i.connection.context.js";
import { PeerCertificate } from "tls";
import { IWinSsoFacade } from "./interfaces/i.win-sso.facade.js";
import { Socket } from "net";
import { URLExt } from "../util/url.ext.js";

@injectable()
export class ConnectionContext implements IConnectionContext {
  private _agent: any;
  private _ntlmHost?: URLExt;
  private _ntlmState: NtlmStateEnum = NtlmStateEnum.NotAuthenticated;
  private _requestBody = Buffer.alloc(0);
  private _winSso?: IWinSsoFacade;
  private _peerCert?: PeerCertificate;
  private _clientAddress = "";
  private _clientSocket?: Socket;
  private _socketCloseListener: any;
  private _configApiConnection = false;
  private _useUpstreamProxy = false;

  get agent(): any {
    return this._agent;
  }
  set agent(agent: any) {
    this._agent = agent;
  }

  get winSso(): IWinSsoFacade {
    if (!this._winSso) {
      throw new Error("WinSso not initialized for context");
    }
    return this._winSso;
  }
  set winSso(winSso: IWinSsoFacade) {
    this._winSso = winSso;
  }

  get peerCert(): PeerCertificate | undefined {
    return this._peerCert;
  }
  set peerCert(peerCert: PeerCertificate | undefined) {
    this._peerCert = peerCert;
  }

  get clientAddress(): string {
    return this._clientAddress;
  }
  set clientAddress(clientAddress: string) {
    this._clientAddress = clientAddress;
  }

  get clientSocket(): Socket | undefined {
    return this._clientSocket;
  }
  set clientSocket(clientSocket: Socket | undefined) {
    this._clientSocket = clientSocket;
  }

  get socketCloseListener(): any {
    return this._socketCloseListener;
  }
  set socketCloseListener(listener: any) {
    this._socketCloseListener = listener;
  }

  get configApiConnection(): boolean {
    return this._configApiConnection;
  }
  set configApiConnection(val: boolean) {
    this._configApiConnection = val;
  }

  get useUpstreamProxy(): boolean {
    return this._useUpstreamProxy;
  }
  set useUpstreamProxy(val: boolean) {
    this._useUpstreamProxy = val;
  }

  /**
   * If the connection is new or a handshake has been completed (successful or failed),
   * a new handshake can be initiated
   *
   * @param {URLExt} ntlmHostUrl The target url
   * @returns {boolean} True if the connection is new or a handshake has been completed
   */
  canStartAuthHandshake(ntlmHostUrl: URLExt): boolean {
    const auth =
      this._ntlmHost === undefined ||
      (this._ntlmHost.href === ntlmHostUrl.href &&
        (this._ntlmState === NtlmStateEnum.Authenticated || this._ntlmState === NtlmStateEnum.NotAuthenticated));
    return auth;
  }

  matchHostOrNew(ntlmHostUrl: URLExt): boolean {
    return this._ntlmHost === undefined || this._ntlmHost.href === ntlmHostUrl.href;
  }

  getState(ntlmHostUrl: URLExt): NtlmStateEnum {
    if (this._ntlmHost && ntlmHostUrl.href === this._ntlmHost.href) {
      return this._ntlmState;
    }
    return NtlmStateEnum.NotAuthenticated;
  }

  setState(ntlmHostUrl: URLExt, authState: NtlmStateEnum) {
    this._ntlmHost = ntlmHostUrl;
    this._ntlmState = authState;
  }

  clearRequestBody() {
    this._requestBody = Buffer.alloc(0);
  }

  addToRequestBody(chunk: Buffer) {
    this._requestBody = Buffer.concat([this._requestBody, chunk]);
  }

  getRequestBody(): Buffer {
    return this._requestBody;
  }

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
