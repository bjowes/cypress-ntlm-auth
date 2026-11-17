import type { NtlmStateType } from "../../models/ntlm.state.ts";
import type { PeerCertificate } from "tls";
import type { IWinSsoFacade } from "./i.win-sso.facade.ts";
import { Socket } from "net";
import http from "http";
import https from "https";
import { TunnelAgent } from "../tunnel.agent.ts";

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
  getState(ntlmHostUrl: URL): NtlmStateType;
  setState(ntlmHostUrl: URL, authState: NtlmStateType): void;

  clearRequestBody(): void;
  addToRequestBody(chunk: Buffer): void;
  getRequestBody(): Buffer;
  destroy(event: string): void;
}
