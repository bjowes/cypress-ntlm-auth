import { NtlmMessage } from "../../ntlm/ntlm.message";
import { PeerCertificate } from "tls";

export interface IWinSsoFacade {
  createAuthRequest(): NtlmMessage;
  createAuthResponse(challengeHeader: string | undefined, targetHost: string, peerCert: PeerCertificate | undefined): NtlmMessage;
}
