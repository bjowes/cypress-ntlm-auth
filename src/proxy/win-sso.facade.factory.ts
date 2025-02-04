import { injectable } from "inversify";
import { PeerCertificate } from "tls";
import { WinSso } from "win-sso";
import { IWinSsoFacadeFactory } from "./interfaces/i.win-sso.facade.factory";
import { IWinSsoFacade } from "./interfaces/i.win-sso.facade";

/**
 * Factory for Win SSO facade
 */
@injectable()
export class WinSsoFacadeFactory implements IWinSsoFacadeFactory {
  /**
   * Creates a Win SSO facade
   * @param securityPackage Security package, protocol identifier
   * @param targetHost Target host to authenticate against
   * @param peerCert Peer certificate, if present
   * @param flags Flags to pass to authentication library 
   * @returns Created Win SSO facade
   */
  create(
    securityPackage: string,
    targetHost: string | undefined,
    peerCert: PeerCertificate | undefined,
    flags: number | undefined
  ): IWinSsoFacade {
    return new WinSso(securityPackage, targetHost, peerCert, flags);
  }
}
