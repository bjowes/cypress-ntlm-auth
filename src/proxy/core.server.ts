
import type { PortsConfig } from "../models/ports.config.model.ts";
import type IConfigController from "./interfaces/i.config.controller.ts";
import type IConfigServer from "./interfaces/i.config.server.ts";
import type IConfigStore from "./interfaces/i.config.store.ts";
import type IConnectionContextManager from "./interfaces/i.connection.context.manager.ts";
import type ICoreServer from "./interfaces/i.core.server.ts";
import type INtlmProxyServer from "./interfaces/i.ntlm.proxy.server.ts";
import type IUpstreamProxyManager from "./interfaces/i.upstream.proxy.manager.ts";

/**
 * Core server
 */
export default class CoreServer implements ICoreServer {
  private readonly _configServer: IConfigServer;
  private readonly _ntlmProxyServer: INtlmProxyServer;
  private readonly _upstreamProxyManager: IUpstreamProxyManager;
  private readonly _configStore: IConfigStore;
  private readonly _connectionContextManager: IConnectionContextManager;
  private readonly _configController: IConfigController;

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
    configServer: IConfigServer,
    ntlmProxyServer: INtlmProxyServer,
    upstreamProxyManager: IUpstreamProxyManager,
    configStore: IConfigStore,
    connectionContextManager: IConnectionContextManager,
    configController: IConfigController
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
