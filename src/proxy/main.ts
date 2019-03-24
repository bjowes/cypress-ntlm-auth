import { DependencyInjection } from "./dependency.injection";
import { CoreServer } from "./core.server";
import { debug } from '../util/debug';

const dependencyInjection = new DependencyInjection();

export class Main {
  private _coreServer: CoreServer;

  constructor(coreServer: CoreServer) {
    this._coreServer = coreServer;
  }

  async run(httpProxy: string, httpsProxy: string, noProxy: string, allowMultipleInstances: boolean) {
    try {
      let ports = await this._coreServer.start(httpProxy, httpsProxy, noProxy, allowMultipleInstances);
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
