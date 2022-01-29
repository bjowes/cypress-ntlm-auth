import getPort from "get-port";

import { IConfigController } from "./interfaces/i.config.controller.js";
import { injectable, inject } from "inversify";
import { IConfigServer } from "./interfaces/i.config.server.js";
import { IExpressServerFacade } from "./interfaces/i.express.server.facade.js";
import { TYPES } from "./dependency.injection.types.js";
import { IDebugLogger } from "../util/interfaces/i.debug.logger.js";
import { IPortsConfigStore } from "./interfaces/i.ports.config.store.js";

@injectable()
export class ConfigServer implements IConfigServer {
  private initDone: boolean = false;
  private _expressServer: IExpressServerFacade;
  private _configController: IConfigController;
  private _portsConfigStore: IPortsConfigStore;
  private _debug: IDebugLogger;

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

  init() {
    if (this.initDone) {
      return;
    }
    this._expressServer.use("/", this._configController.router);
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
      this._portsConfigStore.configApiUrl = await this._expressServer.listen(port);
      this._debug.log("NTLM auth config API listening on port:", port);
      return this._portsConfigStore.configApiUrl;
    } catch (err) {
      this._debug.log("Cannot start NTLM auth config API");
      throw err;
    }
  }

  async stop() {
    this._debug.log("Shutting down config API");
    try {
      await this._expressServer.close();
      this._portsConfigStore.configApiUrl = "";
      this._debug.log("NTLM auth config API stopped");
    } catch (err) {
      this._debug.log("Cannot stop NTLM auth config API");
      throw err;
    }
  }
}
