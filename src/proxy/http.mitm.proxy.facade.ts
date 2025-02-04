import { injectable } from "inversify";
import httpMitmProxy from "@bjowes/http-mitm-proxy";
import { IHttpMitmProxyFacade } from "./interfaces/i.http.mitm.proxy.facade";
import { URLExt } from "../util/url.ext";

/**
 * HTTP MITM proxy facade
 */
@injectable()
export class HttpMitmProxyFacade implements IHttpMitmProxyFacade {
  private readonly _ntlmProxy: httpMitmProxy.IProxy;
  private _ntlmProxyListening = false;

  /**
   * Constructor
   */
  constructor() {
    this._ntlmProxy = httpMitmProxy();
  }

  /**
   * Apply callbacks to HTTP MITM proxy
   * @param mod Object with callbacks
   * @returns The facade for fluent calls
   */
  use(mod: object): IHttpMitmProxyFacade {
    this._ntlmProxy.use(mod);
    return this;
  }

  /**
   * Starts listening to requests
   * @param port Requested port, any free port is used if not set
   * @returns The Url that the proxy listens to
   */
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

  /**
   * Stop the listener
   */
  close(): void {
    if (this._ntlmProxyListening) {
      this._ntlmProxy.close();
      this._ntlmProxyListening = false;
    }
  }
}
