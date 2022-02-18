import { NtlmStateEnum } from "../../models/ntlm.state.enum";
import { PeerCertificate } from "tls";
import { IWinSsoFacade } from "./i.win-sso.facade";
import { Socket } from "net";

export interface IConnectionContext {
  agent: any;
  winSso: IWinSsoFacade;
  peerCert: PeerCertificate | undefined;
  clientAddress: string;
  clientSocket: Socket | undefined;
  socketCloseListener: any;
  configApiConnection: boolean;
  useUpstreamProxy: boolean;

  canStartAuthHandshake(ntlmHostUrl: URL): boolean;
  matchHostOrNew(ntlmHostUrl: URL): boolean;
  getState(ntlmHostUrl: URL): NtlmStateEnum;
  setState(ntlmHostUrl: URL, authState: NtlmStateEnum): void;

  clearRequestBody(): void;
  addToRequestBody(chunk: Buffer): void;
  getRequestBody(): Buffer;
  destroy(event: string): void;
}
