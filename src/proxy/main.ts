import { DependencyInjection } from "./dependency.injection";
import { ICoreServer } from "./interfaces/i.core.server";
import { inject } from "inversify";
import { TYPES } from "./dependency.injection.types";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";

const dependencyInjection = new DependencyInjection();

export class Main {
  private _coreServer: ICoreServer;
  private _debug: IDebugLogger;

  constructor(
    @inject(TYPES.ICoreServer) coreServer: ICoreServer,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._coreServer = coreServer;
    this._debug = debug;
  }

  async run(allowMultipleInstances: boolean, httpProxy?: string, httpsProxy?: string, noProxy?: string, ) {
    try {
      let ports = await this._coreServer.start(allowMultipleInstances, httpProxy, httpsProxy, noProxy);
      this._debug.log('Startup done!');
      this._debug.log(ports);
    } catch (err){
      this._debug.log('Could not start ntlm-proxy');
      throw err;
    }
  }

  stop() {
    this._coreServer.stop(false);
  }
}
