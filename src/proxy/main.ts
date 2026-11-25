import type { ICoreServer } from "./interfaces/i.core.server.ts";
import type { IDebugLogger } from "../util/interfaces/i.debug.logger.ts";
import type { IMain } from "./interfaces/i.main.ts";
import type { PortsConfig } from "../models/ports.config.model.ts";

/**
 * NTLM proxy main class
 */
export class Main implements IMain {
  private readonly _coreServer: ICoreServer;
  private readonly _debug: IDebugLogger;

  /**
   * Constructor
   * @param coreServer Core server
   * @param debug Debug logger
   */
  constructor(coreServer: ICoreServer, debug: IDebugLogger) {
    this._coreServer = coreServer;
    this._debug = debug;
  }

  /**
   * Start up
   * @param httpProxy HTTP_PROXY
   * @param httpsProxy HTTPS_PROXY
   * @param noProxy NO_PROXY
   * @param configApiPort Requested config API port, any free port is used if not set
   * @param ntlmProxyPort Requested NTLM API port, any free port is used if not set
   * @returns Ports config
   */
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

  /**
   * Stop
   */
  async stop() {
    await this._coreServer.stop();
  }
}
