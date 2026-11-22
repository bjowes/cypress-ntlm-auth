import type { PeerCertificate } from "tls";
import type IWinSsoFacade from "./i.win-sso.facade.ts";

export default abstract class IWinSsoFacadeFactory {
  abstract create(
    securityPackage: string,
    targetHost: string | undefined,
    peerCert: PeerCertificate | undefined,
    flags: number | undefined
  ): IWinSsoFacade;
}
