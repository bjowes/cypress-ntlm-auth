import { NtlmStateEnum } from "../../models/ntlm.state.enum";
import { PeerCertificate } from "tls";
import { IWinSsoFacade } from "./i.win-sso.facade";
import { Socket } from "net";
import http from "http";
import https from "https";
import { TunnelAgent } from "../tunnel.agent";

export interface IConnectionContext {
  agent: TunnelAgent | http.Agent | https.Agent;
  winSso: IWinSsoFacade;
  peerCert: PeerCertificate | undefined;
  clientAddress: string;
  clientSocket: Socket | undefined;
  socketCloseListener?: () => void;
  configApiConnection: boolean;
  useUpstreamProxy: boolean;
  isSSL: boolean;

  canStartAuthHandshake(ntlmHostUrl: URL): boolean;
  matchHostOrNew(ntlmHostUrl: URL, isSSL: boolean): boolean;
  getState(ntlmHostUrl: URL): NtlmStateEnum;
  setState(ntlmHostUrl: URL, authState: NtlmStateEnum): void;

  clearRequestBody(): void;
  addToRequestBody(chunk: Buffer): void;
  getRequestBody(): Buffer;
  destroy(event: string): void;
}
