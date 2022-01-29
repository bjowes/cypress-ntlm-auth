import { injectable } from "inversify";
import { PeerCertificate } from "tls";
import { IWinSsoFacade } from "./interfaces/i.win-sso.facade.js";
import { WinSso } from "win-sso";

@injectable()
export class WinSsoFacade implements IWinSsoFacade {
  private _winSso: WinSso;

  constructor(securityPackage: string, targetHost: string | undefined, peerCert: PeerCertificate | undefined) {
    this._winSso = new WinSso(securityPackage, targetHost, peerCert);
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
