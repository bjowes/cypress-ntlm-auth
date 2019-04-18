import { injectable, inject } from 'inversify';
import axios from 'axios';

import { PortsFile } from '../models/ports.file.model';
import { IConfigController } from './interfaces/i.config.controller';
import { IConfigServer } from './interfaces/i.config.server';
import { IConfigStore } from './interfaces/i.config.store';
import { IConnectionContextManager } from './interfaces/i.connection.context.manager';
import { ICoreServer } from './interfaces/i.core.server';
import { INtlmProxyServer } from './interfaces/i.ntlm.proxy.server';
import { IUpstreamProxyManager } from './interfaces/i.upstream.proxy.manager';
import { IPortsFileService } from '../util/interfaces/i.ports.file.service';
import { TYPES } from './dependency.injection.types';
import { IDebugLogger } from '../util/interfaces/i.debug.logger';

@injectable()
export class CoreServer implements ICoreServer {
  private _configServer: IConfigServer;
  private _ntlmProxyServer: INtlmProxyServer;
  private _portsFileService: IPortsFileService;
  private _upstreamProxyManager: IUpstreamProxyManager;
  private _configStore: IConfigStore;
  private _connectionContextManager: IConnectionContextManager;
  private _configController: IConfigController;
  private _debug: IDebugLogger;

  constructor(
    @inject(TYPES.IConfigServer) configServer: IConfigServer,
    @inject(TYPES.INtlmProxyServer) ntlmProxyServer: INtlmProxyServer,
    @inject(TYPES.IPortsFileService) portsFileService: IPortsFileService,
    @inject(TYPES.IUpstreamProxyManager) upstreamProxyManager: IUpstreamProxyManager,
    @inject(TYPES.IConfigStore) configStore: IConfigStore,
    @inject(TYPES.IConnectionContextManager) connectionContextManager: IConnectionContextManager,
    @inject(TYPES.IConfigController) configController: IConfigController,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._configServer = configServer;
    this._ntlmProxyServer = ntlmProxyServer;
    this._portsFileService = portsFileService;
    this._upstreamProxyManager = upstreamProxyManager;
    this._configStore = configStore;
    this._connectionContextManager = connectionContextManager;
    this._configController = configController;
    this._debug = debug;

    this._configController.configApiEvent.addListener('reset', () => this.ntlmConfigReset());
    this._configController.configApiEvent.addListener('quit',
      async (keepPortsFile: boolean) => await this.stop(keepPortsFile));
  }

  async start(allowMultipleInstances: boolean, httpProxy?: string, httpsProxy?: string, noProxy?: string): Promise<PortsFile> {
    await this.stopExistingInstance(allowMultipleInstances);
    this._upstreamProxyManager.init(httpProxy, httpsProxy, noProxy);
    let configApiUrl = await this._configServer.start();
    let ntlmProxyUrl: string;
    try {
      ntlmProxyUrl = await this._ntlmProxyServer.start();
    } catch (err) {
      await this._configServer.stop();
      throw err;
    }
    let ports: PortsFile = {
      configApiUrl: configApiUrl,
      ntlmProxyUrl: ntlmProxyUrl
    };
    try {
      await this._portsFileService.save(ports);
      this._debug.log('wrote %s', this._portsFileService.fullPath())
    } catch (err) {
      await this._configServer.stop();
      this._ntlmProxyServer.stop();
      throw err;
    }
    return ports;
  }

  async stop(keepPortsFile: boolean) {
    if (keepPortsFile === false) {
      await this._portsFileService.delete();
      this._debug.log('ports file deleted');
    }
    this.ntlmConfigReset();
    await this._configServer.stop();
    this._ntlmProxyServer.stop();
    this._upstreamProxyManager.reset();
  }

  private async stopExistingInstance(allowMultipleInstances: boolean) {
    if (this._portsFileService.exists()) {
      if (allowMultipleInstances) {
        this._debug.log('Existing proxy instance found, leave it running since multiple instances are allowed');
        return;
      }
      this._debug.log('Existing proxy instance found, sending shutdown');
      let ports = this._portsFileService.parse();
      try {
        await axios.post(ports.configApiUrl + '/quit',
        { keepPortsFile: true },
        { timeout: 15000 });
      } catch (err) {
        this._debug.log('Quit request failed, trying to delete the ports file: ' + err);
      }
      await this._portsFileService.delete();
      this._debug.log('ports file deleted');
    }
  }

  private ntlmConfigReset() {
    this._configStore.clear();
    this._connectionContextManager.removeAllConnectionContexts('reset');
  }

}
