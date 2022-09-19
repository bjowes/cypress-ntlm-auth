import { injectable } from "inversify";
import { PeerCertificate } from "tls";
import { WinSso } from "win-sso";
import { IWinSsoFacadeFactory } from "./interfaces/i.win-sso.facade.factory";
import { IWinSsoFacade } from "./interfaces/i.win-sso.facade";

@injectable()
export class WinSsoFacadeFactory implements IWinSsoFacadeFactory {
  create(
    securityPackage: string,
    targetHost: string | undefined,
    peerCert: PeerCertificate | undefined,
    delegate: boolean
  ): IWinSsoFacade {
    return new WinSso(securityPackage, targetHost, peerCert, delegate);
  }
}
