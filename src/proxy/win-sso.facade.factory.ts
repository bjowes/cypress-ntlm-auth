import type { PeerCertificate } from "tls";

import type { IWinSsoFacadeFactory } from "./interfaces/i.win-sso.facade.factory.ts";
import type { IWinSsoFacade } from "./interfaces/i.win-sso.facade.ts";
import { WinSsoFacade } from "./win-sso.facade.ts";

/**
 * Factory for Win SSO facade
 */
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
    return new WinSsoFacade(securityPackage, targetHost, peerCert, flags);
  }
}
