import type { PeerCertificate } from "tls";
import type { IWinSsoFacade } from "./i.win-sso.facade.ts";

export interface IWinSsoFacadeFactory {
  create(
    securityPackage: string,
    targetHost: string | undefined,
    peerCert: PeerCertificate | undefined,
    flags: number | undefined
  ): IWinSsoFacade;
}
