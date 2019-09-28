import { NtlmMessage } from "../ntlm/ntlm.message";
import { injectable, inject } from 'inversify';
import { PeerCertificate } from "tls";
import { IWinSsoFacade } from "./interfaces/i.win-sso.facade";
import { TYPES } from "./dependency.injection.types";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { WinSso, osSupported } from 'win-sso';

@injectable()
export class WinSsoFacade implements IWinSsoFacade {

  private _debug: IDebugLogger;

  constructor(
    @inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._debug = debug;

    if (osSupported()) {
      this._debug.log('SSO is supported');
    } else {
      this._debug.log('SSO is not supported');
    }
  }

  createAuthRequest(): NtlmMessage {
    if (!osSupported()) {
      throw new Error('Invalid call to WinSso createAuthRequest, WinSso not loaded');
    }
    let msg = new NtlmMessage(WinSso.createAuthRequest());
    return msg;
  }

  createAuthResponse(challengeHeader: string | undefined, targetHost: string, peerCert: PeerCertificate | undefined): NtlmMessage {
    if (!osSupported()) {
      throw new Error('Invalid call to WinSso createAuthResponse, WinSso not loaded');
    }
    let msg = new NtlmMessage(WinSso.createAuthResponse(challengeHeader || '', targetHost, peerCert));
    return msg;
  }
}
