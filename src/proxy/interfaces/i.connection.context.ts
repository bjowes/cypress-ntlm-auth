import { NtlmStateEnum } from "../../models/ntlm.state.enum";
import { CompleteUrl } from "../../models/complete.url.model";
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

  isNewOrAuthenticated(ntlmHostUrl: CompleteUrl): boolean;
  matchHostOrNew(ntlmHostUrl: CompleteUrl): boolean;
  getState(ntlmHostUrl: CompleteUrl): NtlmStateEnum;
  setState(ntlmHostUrl: CompleteUrl, authState: NtlmStateEnum): void;

  clearRequestBody(): void;
  addToRequestBody(chunk: Buffer): void;
  getRequestBody(): Buffer;
  destroy(event: string): void;
}
