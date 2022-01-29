import { ICoreServer } from "./interfaces/i.core.server.js";
import { inject, injectable } from "inversify";
import { TYPES } from "./dependency.injection.types.js";
import { IDebugLogger } from "../util/interfaces/i.debug.logger.js";
import { IMain } from "./interfaces/i.main.js";
import { PortsConfig } from "../models/ports.config.model.js";

@injectable()
export class Main implements IMain {
  private _coreServer: ICoreServer;
  private _debug: IDebugLogger;

  constructor(@inject(TYPES.ICoreServer) coreServer: ICoreServer, @inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._coreServer = coreServer;
    this._debug = debug;
  }

  async run(
    httpProxy?: string,
    httpsProxy?: string,
    noProxy?: string,
    configApiPort?: number,
    ntlmProxyPort?: number
  ): Promise<PortsConfig> {
    try {
      const ports = await this._coreServer.start(httpProxy, httpsProxy, noProxy, configApiPort, ntlmProxyPort);
      this._debug.log("Startup done!");
      this._debug.log(ports);
      return ports;
    } catch (err) {
      this._debug.log("Could not start ntlm-proxy");
      throw err;
    }
  }

  async stop() {
    await this._coreServer.stop();
  }
}
