import { injectable, inject } from "inversify";

import { PortsConfig } from "../models/ports.config.model";
import { IConfigController } from "./interfaces/i.config.controller";
import { IConfigServer } from "./interfaces/i.config.server";
import { IConfigStore } from "./interfaces/i.config.store";
import { IConnectionContextManager } from "./interfaces/i.connection.context.manager";
import { ICoreServer } from "./interfaces/i.core.server";
import { INtlmProxyServer } from "./interfaces/i.ntlm.proxy.server";
import { IUpstreamProxyManager } from "./interfaces/i.upstream.proxy.manager";
import { TYPES } from "./dependency.injection.types";

/**
 * Core server
 */
@injectable()
export class CoreServer implements ICoreServer {
  private _configServer: IConfigServer;
  private _ntlmProxyServer: INtlmProxyServer;
  private _upstreamProxyManager: IUpstreamProxyManager;
  private _configStore: IConfigStore;
  private _connectionContextManager: IConnectionContextManager;
  private _configController: IConfigController;

  /**
   * Constructor
   * @param configServer Config server
   * @param ntlmProxyServer NTLM proxy server
   * @param upstreamProxyManager Upstream proxy manager
   * @param configStore Config store
   * @param connectionContextManager Connection context manager 
   * @param configController Config controller
   */
  constructor(
    @inject(TYPES.IConfigServer) configServer: IConfigServer,
    @inject(TYPES.INtlmProxyServer) ntlmProxyServer: INtlmProxyServer,
    @inject(TYPES.IUpstreamProxyManager)
    upstreamProxyManager: IUpstreamProxyManager,
    @inject(TYPES.IConfigStore) configStore: IConfigStore,
    @inject(TYPES.IConnectionContextManager)
    connectionContextManager: IConnectionContextManager,
    @inject(TYPES.IConfigController) configController: IConfigController
  ) {
    this._configServer = configServer;
    this._ntlmProxyServer = ntlmProxyServer;
    this._upstreamProxyManager = upstreamProxyManager;
    this._configStore = configStore;
    this._connectionContextManager = connectionContextManager;
    this._configController = configController;

    this._configController.configApiEvent.addListener("reset", () => this.ntlmConfigReset("reset"));
    this._configController.configApiEvent.addListener("quit", async () => await this.stop());
  }

  /**
   * Starts both NTLM proxy and Config API
   * @param httpProxy HTTP_PROXY
   * @param httpsProxy HTTPS_PROXY
   * @param noProxy NO_PROXY
   * @param configApiPort Requested Config API port, any free port is used if not set
   * @param ntlmProxyPort Requested NTLM proxy port, any free port is used if not set
   * @returns Ports config
   */
  async start(
    httpProxy?: string,
    httpsProxy?: string,
    noProxy?: string,
    configApiPort?: number,
    ntlmProxyPort?: number
  ): Promise<PortsConfig> {
    this._upstreamProxyManager.init(httpProxy, httpsProxy, noProxy);
    const configApiUrl = await this._configServer.start(configApiPort);
    let ntlmProxyUrl: string;
    try {
      ntlmProxyUrl = await this._ntlmProxyServer.start(ntlmProxyPort);
    } catch (err) {
      await this._configServer.stop();
      throw err;
    }
    const ports: PortsConfig = {
      configApiUrl: configApiUrl,
      ntlmProxyUrl: ntlmProxyUrl,
    };
    return ports;
  }

  /**
   * Stop NTLM proxy and Config API
   */
  async stop() {
    this.ntlmConfigReset("stop");
    await this._configServer.stop();
    this._ntlmProxyServer.stop();
    this._upstreamProxyManager.reset();
  }

  private ntlmConfigReset(event: string) {
    this._configStore.clear();
    this._connectionContextManager.removeAllConnectionContexts(event);
    this._connectionContextManager.removeAndCloseAllTunnels(event);
    this._connectionContextManager.resetHttpsValidation();
  }
}
