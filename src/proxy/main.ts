import { ICoreServer } from "./interfaces/i.core.server";
import { inject, injectable } from "inversify";
import { TYPES } from "./dependency.injection.types";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { IMain } from "./interfaces/i.main";

@injectable()
export class Main implements IMain {
  private _coreServer: ICoreServer;
  private _debug: IDebugLogger;

  constructor(
    @inject(TYPES.ICoreServer) coreServer: ICoreServer,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._coreServer = coreServer;
    this._debug = debug;
  }

  async run(allowMultipleInstances: boolean, httpProxy?: string, httpsProxy?: string, noProxy?: string) {
    try {
      let ports = await this._coreServer.start(allowMultipleInstances, httpProxy, httpsProxy, noProxy);
      this._debug.log('Startup done!');
      this._debug.log(ports);
    } catch (err){
      this._debug.log('Could not start ntlm-proxy');
      throw err;
    }
  }

  async stop() {
    await this._coreServer.stop(false);
  }
}
