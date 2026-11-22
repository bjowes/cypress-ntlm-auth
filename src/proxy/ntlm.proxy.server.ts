
import type INtlmProxyServer from "./interfaces/i.ntlm.proxy.server.ts";
import type INtlmProxyMitm from "./interfaces/i.ntlm.proxy.mitm.ts";
import type IHttpMitmProxyFacade from "./interfaces/i.http.mitm.proxy.facade.ts";
import type IDebugLogger from "../util/interfaces/i.debug.logger.ts";
import type IPortsConfigStore from "./interfaces/i.ports.config.store.ts";

/**
 * NTLM Proxy server
 */
export default class NtlmProxyServer implements INtlmProxyServer {
  private initDone: boolean = false;
  private readonly _ntlmProxyMitm: INtlmProxyMitm;
  private readonly _httpMitmProxy: IHttpMitmProxyFacade;
  private readonly _portsConfigStore: IPortsConfigStore;
  private readonly _debug: IDebugLogger;

  /**
   * Constructor
   * @param ntlmProxyMitm NTLM MITM proxy
   * @param httpMitmProxyFacade HTTP MITM proxy facade 
   * @param portsConfigStore Ports config accessor
   * @param debug Debug logger
   */
  constructor(
    ntlmProxyMitm: INtlmProxyMitm,
    httpMitmProxyFacade: IHttpMitmProxyFacade,
    portsConfigStore: IPortsConfigStore,
    debug: IDebugLogger
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
