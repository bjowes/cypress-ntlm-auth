import { injectable } from "inversify";
import httpMitmProxy from "http-mitm-proxy";
import { IHttpMitmProxyFacade } from "./interfaces/i.http.mitm.proxy.facade.js";

@injectable()
export class HttpMitmProxyFacade implements IHttpMitmProxyFacade {
  private readonly _ntlmProxy: httpMitmProxy.IProxy;
  private _ntlmProxyListening = false;

  constructor() {
    this._ntlmProxy = httpMitmProxy();
  }

  use(mod: any): IHttpMitmProxyFacade {
    this._ntlmProxy.use(mod);
    return this;
  }

  listen(port: number): Promise<string> {
    return new Promise<string>((resolve, reject) =>
      this._ntlmProxy.listen({ host: "localhost", port: port, keepAlive: true, forceSNI: false }, (err: Error) => {
        if (err) {
          reject(err);
        }
        this._ntlmProxyListening = true;
        const url = "http://127.0.0.1:" + port;
        resolve(url);
      })
    );
  }

  close(): void {
    if (this._ntlmProxyListening) {
      this._ntlmProxy.close();
      this._ntlmProxyListening = false;
    }
  }
}
