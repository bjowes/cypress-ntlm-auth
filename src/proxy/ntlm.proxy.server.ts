import { injectable, inject } from "inversify";

import { INtlmProxyServer } from "./interfaces/i.ntlm.proxy.server";
import { INtlmProxyMitm } from "./interfaces/i.ntlm.proxy.mitm";
import { TYPES } from "./dependency.injection.types";
import { IHttpMitmProxyFacade } from "./interfaces/i.http.mitm.proxy.facade";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { IPortsConfigStore } from "./interfaces/i.ports.config.store";

/**
 * NTLM Proxy server
 */
@injectable()
export class NtlmProxyServer implements INtlmProxyServer {
  private initDone: boolean = false;
  private _ntlmProxyMitm: INtlmProxyMitm;
  private _httpMitmProxy: IHttpMitmProxyFacade;
  private _portsConfigStore: IPortsConfigStore;
  private _debug: IDebugLogger;

  /**
   * Constructor
   * @param ntlmProxyMitm NTLM MITM proxy
   * @param httpMitmProxyFacade HTTP MITM proxy facade 
   * @param portsConfigStore Ports config accessor
   * @param debug Debug logger
   */
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

  /**
   * Initialize HTTP MITM Proxy
   */
  init(): void {
    if (this.initDone) {
      return;
    }
    this._httpMitmProxy.use(this._ntlmProxyMitm);
    this.initDone = true;
  }

  /**
   * Start the NTLM proxy, start listening to requests
   * @param port Port to listen on, some free port is used if not set
   * @returns NTLM proxy Url
   */
  async start(port?: number): Promise<string> {
    this.init();

    try {
      this._portsConfigStore.ntlmProxyUrl = await this._httpMitmProxy.listen(
        port ?? 0
      );
      this._debug.log(
        "NTLM auth proxy listening on :",
        this._portsConfigStore.ntlmProxyUrl.origin
      );
      return this._portsConfigStore.ntlmProxyUrl.origin;
    } catch (err) {
      this._debug.log("Cannot start NTLM auth proxy");
      throw err;
    }
  }

  /**
   * Stops the NTLM proxy
   */
  stop() {
    this._debug.log("Shutting down NTLM proxy");
    this._httpMitmProxy.close();
    this._portsConfigStore.ntlmProxyUrl = undefined;
  }
}
