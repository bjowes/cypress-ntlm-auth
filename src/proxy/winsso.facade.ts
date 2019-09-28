import { NtlmMessage } from "../ntlm/ntlm.message";
import { WinSso } from 'win-sso';
import { injectable } from 'inversify';
import { PeerCertificate } from "tls";
import { IWinSsoFacade } from "./interfaces/i.winsso.facade";

@injectable()
export class WinSsoFacade implements IWinSsoFacade {

  createAuthRequest(): NtlmMessage {
    let msg = new NtlmMessage(WinSso.createAuthRequest());
    return msg;
  }

  createAuthResponse(challengeHeader: string | undefined, targetHost: string, peerCert: PeerCertificate | undefined): NtlmMessage {
    let msg = new NtlmMessage(WinSso.createAuthResponse(challengeHeader || '', targetHost, peerCert));
    return msg;
  }
}
