import { NtlmStateEnum } from '../../models/ntlm.state.enum';
import { CompleteUrl } from '../../models/complete.url.model';
import { PeerCertificate } from 'tls';

export interface IConnectionContext {
  agent: any;
  useSso: boolean;
  peerCert: PeerCertificate | undefined;

  isAuthenticated(ntlmHostUrl: CompleteUrl): boolean;
  isNewOrAuthenticated(ntlmHostUrl: CompleteUrl): boolean;
  getState(ntlmHostUrl: CompleteUrl): NtlmStateEnum;
  setState(ntlmHostUrl: CompleteUrl, authState: NtlmStateEnum): void;
  resetState(ntlmHostUrl: CompleteUrl): void;

  clearRequestBody(): void;
  addToRequestBody(chunk: Buffer): void;
  getRequestBody(): Buffer;
}
