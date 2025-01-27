import { injectable } from "inversify";
import httpMitmProxy from "@bjowes/http-mitm-proxy";
import { IHttpMitmProxyFacade } from "./interfaces/i.http.mitm.proxy.facade";
import { URLExt } from "../util/url.ext";

@injectable()
export class HttpMitmProxyFacade implements IHttpMitmProxyFacade {
  private readonly _ntlmProxy: httpMitmProxy.IProxy;
  private _ntlmProxyListening = false;

  constructor() {
    this._ntlmProxy = httpMitmProxy();
  }

  use(mod: object): IHttpMitmProxyFacade {
    this._ntlmProxy.use(mod);
    return this;
  }

  listen(port: number): Promise<URL> {
    return new Promise<URL>((resolve, reject) =>
      this._ntlmProxy.listen(
        { host: "127.0.0.1", port: port, keepAlive: true, forceSNI: false },
        (err: Error) => {
          if (err) {
            return reject(err);
          }
          this._ntlmProxyListening = true;
          const addressInfo = this._ntlmProxy.address();
          resolve(URLExt.addressInfoToUrl(addressInfo, "http:"));
        }
      )
    );
  }

  close(): void {
    if (this._ntlmProxyListening) {
      this._ntlmProxy.close();
      this._ntlmProxyListening = false;
    }
  }
}
