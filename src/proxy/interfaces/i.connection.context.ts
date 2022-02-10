import { NtlmStateEnum } from "../../models/ntlm.state.enum.js";
import { PeerCertificate } from "tls";
import { IWinSsoFacade } from "./i.win-sso.facade.js";
import { Socket } from "net";
import { URLExt } from "../../util/url.ext.js";

export interface IConnectionContext {
  agent: any;
  winSso: IWinSsoFacade;
  peerCert: PeerCertificate | undefined;
  clientAddress: string;
  clientSocket: Socket | undefined;
  socketCloseListener: any;
  configApiConnection: boolean;
  useUpstreamProxy: boolean;

  canStartAuthHandshake(ntlmHostUrl: URLExt): boolean;
  matchHostOrNew(ntlmHostUrl: URLExt): boolean;
  getState(ntlmHostUrl: URLExt): NtlmStateEnum;
  setState(ntlmHostUrl: URLExt, authState: NtlmStateEnum): void;

  clearRequestBody(): void;
  addToRequestBody(chunk: Buffer): void;
  getRequestBody(): Buffer;
  destroy(event: string): void;
}
