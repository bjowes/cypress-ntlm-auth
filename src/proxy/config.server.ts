import { IConfigController } from "./interfaces/i.config.controller";
import { injectable, inject } from "inversify";
import { IConfigServer } from "./interfaces/i.config.server";
import { IExpressServerFacade } from "./interfaces/i.express.server.facade";
import { TYPES } from "./dependency.injection.types";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { IPortsConfigStore } from "./interfaces/i.ports.config.store";

/**
 * Config API server
 */
@injectable()
export class ConfigServer implements IConfigServer {
  private initDone: boolean = false;
  private _expressServer: IExpressServerFacade;
  private _configController: IConfigController;
  private _portsConfigStore: IPortsConfigStore;
  private _debug: IDebugLogger;

  /**
   * Constructor
   * @param expressServer Express server facade
   * @param configController Config controller
   * @param portsConfigStore Ports config store
   * @param debug Debug logger
   */
  constructor(
    @inject(TYPES.IExpressServerFacade) expressServer: IExpressServerFacade,
    @inject(TYPES.IConfigController) configController: IConfigController,
    @inject(TYPES.IPortsConfigStore) portsConfigStore: IPortsConfigStore,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger
  ) {
    this._expressServer = expressServer;
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
