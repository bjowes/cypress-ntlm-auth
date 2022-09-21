import { PeerCertificate } from "tls";
import { IWinSsoFacade } from "./i.win-sso.facade";

export interface IWinSsoFacadeFactory {
  create(
    securityPackage: string,
    targetHost: string | undefined,
    peerCert: PeerCertificate | undefined,
    flags: number | undefined
  ): IWinSsoFacade;
}
