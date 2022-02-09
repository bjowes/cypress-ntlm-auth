import { PeerCertificate } from "node:tls";
import { IWinSsoFacade } from "./i.win-sso.facade";

export interface IWinSsoFacadeFactory {
  create(securityPackage: string, targetHost: string | undefined, peerCert: PeerCertificate | undefined): IWinSsoFacade;
}
