import { injectable, inject } from "inversify";

import { PortsConfig } from "../models/ports.config.model.js";
import { IConfigController } from "./interfaces/i.config.controller.js";
import { IConfigServer } from "./interfaces/i.config.server.js";
import { IConfigStore } from "./interfaces/i.config.store.js";
import { IConnectionContextManager } from "./interfaces/i.connection.context.manager.js";
import { ICoreServer } from "./interfaces/i.core.server.js";
import { INtlmProxyServer } from "./interfaces/i.ntlm.proxy.server.js";
import { IUpstreamProxyManager } from "./interfaces/i.upstream.proxy.manager.js";
import { TYPES } from "./dependency.injection.types.js";

@injectable()
export class CoreServer implements ICoreServer {
  private _configServer: IConfigServer;
  private _ntlmProxyServer: INtlmProxyServer;
  private _upstreamProxyManager: IUpstreamProxyManager;
  private _configStore: IConfigStore;
  private _connectionContextManager: IConnectionContextManager;
  private _configController: IConfigController;

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
  }
}
