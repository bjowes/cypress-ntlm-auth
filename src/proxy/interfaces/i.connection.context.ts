import type { NtlmStateType } from "../../models/ntlm.state.ts";
import type { PeerCertificate } from "tls";
import type IWinSsoFacade from "./i.win-sso.facade.ts";
import { Socket } from "net";
import http from "http";
import https from "https";
import { TunnelAgent } from "../tunnel.agent.ts";

export default abstract class IConnectionContext {
  abstract agent: TunnelAgent | http.Agent | https.Agent;
  abstract winSso: IWinSsoFacade;
  abstract peerCert: PeerCertificate | undefined;
  abstract clientAddress: string;
  abstract clientSocket: Socket | undefined;
  abstract socketCloseListener?: () => void;
  abstract configApiConnection: boolean;
  abstract useUpstreamProxy: boolean;
  abstract isSSL: boolean;

  abstract canStartAuthHandshake(ntlmHostUrl: URL): boolean;
  abstract matchHostOrNew(ntlmHostUrl: URL, isSSL: boolean): boolean;
  abstract getState(ntlmHostUrl: URL): NtlmStateType;
  abstract setState(ntlmHostUrl: URL, authState: NtlmStateType): void;

  abstract clearRequestBody(): void;
  abstract addToRequestBody(chunk: Buffer): void;
  abstract getRequestBody(): Buffer;
  abstract destroy(event: string): void;
}
