import { injectable } from "inversify";
import { PeerCertificate } from "tls";
import { IWinSsoFacade } from "./interfaces/i.win-sso.facade";
import { WinSso } from "win-sso";

@injectable()
export class WinSsoFacade implements IWinSsoFacade {
  private _winSso: WinSso;

  constructor(securityPackage: string, targetHost: string | undefined,
    peerCert: PeerCertificate | undefined, flags: number | undefined) {
    this._winSso = new WinSso(securityPackage, targetHost, peerCert, flags);
  }

  createAuthRequestHeader(): string {
    return this._winSso.createAuthRequestHeader();
  }

  createAuthResponseHeader(challengeHeader: string | undefined): string {
    return this._winSso.createAuthResponseHeader(challengeHeader || "");
  }

  freeAuthContext(): void {
    this._winSso.freeAuthContext();
  }
}
