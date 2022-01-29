import { NtlmStateEnum } from "../../models/ntlm.state.enum.js";
import { CompleteUrl } from "../../models/complete.url.model.js";
import { PeerCertificate } from "tls";
import { IWinSsoFacade } from "./i.win-sso.facade.js";
import { Socket } from "net";

export interface IConnectionContext {
  agent: any;
  winSso: IWinSsoFacade;
  peerCert: PeerCertificate | undefined;
  clientAddress: string;
  clientSocket: Socket | undefined;
  socketCloseListener: any;
  configApiConnection: boolean;

  canStartAuthHandshake(ntlmHostUrl: CompleteUrl): boolean;
  matchHostOrNew(ntlmHostUrl: CompleteUrl): boolean;
  getState(ntlmHostUrl: CompleteUrl): NtlmStateEnum;
  setState(ntlmHostUrl: CompleteUrl, authState: NtlmStateEnum): void;

  clearRequestBody(): void;
  addToRequestBody(chunk: Buffer): void;
  getRequestBody(): Buffer;
  destroy(event: string): void;
}
