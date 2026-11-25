import type { IConfigController } from "./interfaces/i.config.controller.ts";
import type { IConfigServer } from "./interfaces/i.config.server.ts";
import type { IExpressServerFacade } from "./interfaces/i.express.server.facade.ts";
import type { IDebugLogger } from "../util/interfaces/i.debug.logger.ts";
import type { IPortsConfigStore } from "./interfaces/i.ports.config.store.ts";

/**
 * Config API server
 */
export class ConfigServer implements IConfigServer {
  private initDone: boolean = false;
  private readonly _expressServer: IExpressServerFacade;
  private readonly _configController: IConfigController;
  private readonly _portsConfigStore: IPortsConfigStore;
  private readonly _debug: IDebugLogger;

  /**
   * Constructor
   * @param expressServerFacade Express server facade
   * @param configController Config controller
   * @param portsConfigStore Ports config store
   * @param debug Debug logger
   */
  constructor(
    expressServerFacade: IExpressServerFacade,
    configController: IConfigController,
    portsConfigStore: IPortsConfigStore,
    debug: IDebugLogger
  ) {
    this._expressServer = expressServerFacade;
    this._configController = configController;
    this._portsConfigStore = portsConfigStore;
    this._debug = debug;
  }

  /**
   * Init server
   */
  init(): void {
    if (this.initDone) {
      return;
    }
    this._expressServer.use("/", this._configController.router);
    this.initDone = true;
  }

  /**
   * Start Config API listener
   * @param port Requested port, any free port is used if not set
   * @returns The Url that Config API listens to
   */
  async start(port?: number): Promise<string> {
    this.init();

    try {
      this._portsConfigStore.configApiUrl = await this._expressServer.listen(
        port ?? 0
      );
      this._debug.log(
        "NTLM auth config API listening on:",
        this._portsConfigStore.configApiUrl.origin
      );
      return this._portsConfigStore.configApiUrl.origin;
    } catch (err) {
      this._debug.log("Cannot start NTLM auth config API");
      throw err;
    }
  }

  /**
   * Stop listener
   */
  async stop() {
    this._debug.log("Shutting down config API");
    try {
      await this._expressServer.close();
      this._portsConfigStore.configApiUrl = undefined;
      this._debug.log("NTLM auth config API stopped");
    } catch (err) {
      this._debug.log("Cannot stop NTLM auth config API");
      throw err;
    }
  }
}
