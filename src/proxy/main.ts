import { DependencyInjection } from "./dependency.injection";
import { debug } from '../util/debug';
import { ICoreServer } from "./interfaces/i.core.server";
import { inject } from "inversify";
import { TYPES } from "./dependency.injection.types";

const dependencyInjection = new DependencyInjection();

export class Main {
  private _coreServer: ICoreServer;

  constructor(@inject(TYPES.ICoreServer) coreServer: ICoreServer) {
    this._coreServer = coreServer;
  }

  async run(allowMultipleInstances: boolean, httpProxy?: string, httpsProxy?: string, noProxy?: string, ) {
    try {
      let ports = await this._coreServer.start(allowMultipleInstances, httpProxy, httpsProxy, noProxy);
      debug('Startup done!');
      debug(ports);
    } catch (err){
      debug('Could not start ntlm-proxy');
      throw err;
    }
  }

  stop() {
    this._coreServer.stop(false);
  }
}
