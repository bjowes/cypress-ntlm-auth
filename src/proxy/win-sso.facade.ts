import { injectable } from "inversify";
import { PeerCertificate } from "tls";
import { IWinSsoFacade } from "./interfaces/i.win-sso.facade";
import { WinSso } from "win-sso";

/**
 * Facade for Win SSO library
 */
@injectable()
export class WinSsoFacade implements IWinSsoFacade {
  private _winSso: WinSso;

  /**
   * Constructor
   * @param securityPackage Security package, protocol identifier
   * @param targetHost Target host to authenticate against
   * @param peerCert Peer certificate, if present
   * @param flags Flags to pass to authentication library 
   */
  constructor(securityPackage: string, targetHost: string | undefined,
    peerCert: PeerCertificate | undefined, flags: number | undefined) {
    this._winSso = new WinSso(securityPackage, targetHost, peerCert, flags);
  }

  /**
   * Creates and auth request header
   * @returns Auth request header
   */
  createAuthRequestHeader(): string {
    return this._winSso.createAuthRequestHeader();
  }

  /**
   * Creates and auth response header
   * @param challengeHeader Challenge header
   * @returns Auth response header
   */
  createAuthResponseHeader(challengeHeader: string | undefined): string {
    return this._winSso.createAuthResponseHeader(challengeHeader || "");
  }

  /**
   * Free authentication context
   */
  freeAuthContext(): void {
    this._winSso.freeAuthContext();
  }
}
