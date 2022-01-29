import getPort from "get-port";

import { injectable, inject } from "inversify";

import { INtlmProxyServer } from "./interfaces/i.ntlm.proxy.server.js";
import { INtlmProxyMitm } from "./interfaces/i.ntlm.proxy.mitm.js";
import { TYPES } from "./dependency.injection.types.js";
import { IHttpMitmProxyFacade } from "./interfaces/i.http.mitm.proxy.facade.js";
import { IDebugLogger } from "../util/interfaces/i.debug.logger.js";
import { IPortsConfigStore } from "./interfaces/i.ports.config.store.js";

@injectable()
export class NtlmProxyServer implements INtlmProxyServer {
  private initDone: boolean = false;
  private _ntlmProxyMitm: INtlmProxyMitm;
  private _httpMitmProxy: IHttpMitmProxyFacade;
  private _portsConfigStore: IPortsConfigStore;
  private _debug: IDebugLogger;

  constructor(
    @inject(TYPES.INtlmProxyMitm) ntlmProxyMitm: INtlmProxyMitm,
    @inject(TYPES.IHttpMitmProxyFacade)
    httpMitmProxyFacade: IHttpMitmProxyFacade,
    @inject(TYPES.IPortsConfigStore) portsConfigStore: IPortsConfigStore,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger
  ) {
    this._ntlmProxyMitm = ntlmProxyMitm;
    this._httpMitmProxy = httpMitmProxyFacade;
    this._portsConfigStore = portsConfigStore;
    this._debug = debug;
  }

  init() {
    if (this.initDone) {
      return;
    }
    this._httpMitmProxy.use(this._ntlmProxyMitm);
    this.initDone = true;
  }

  async start(port?: number): Promise<string> {
    this.init();

    try {
      if (!port) {
        port = await getPort();
        if (port === undefined) {
          this._debug.log("Cannot find free port");
          throw new Error("Cannot find free port");
        }
      }
      await this._httpMitmProxy.listen(port);
      this._debug.log("NTLM auth proxy listening on port:", port);
      this._portsConfigStore.ntlmProxyUrl = "http://127.0.0.1:" + port;
      this._portsConfigStore.ntlmProxyPort = String(port);
      return this._portsConfigStore.ntlmProxyUrl;
    } catch (err) {
      this._debug.log("Cannot start NTLM auth proxy");
      throw err;
    }
  }

  stop() {
    this._debug.log("Shutting down NTLM proxy");
    this._httpMitmProxy.close();
    this._portsConfigStore.ntlmProxyUrl = "";
    this._portsConfigStore.ntlmProxyPort = "";
  }
}
