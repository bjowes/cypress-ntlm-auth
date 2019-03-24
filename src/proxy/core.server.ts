import { injectable } from 'inversify';

import { ConfigServer } from "./config.server";
import { NtlmProxyServer } from "./ntlm.proxy.server";
import { PortsFile } from '../models/ports.file.model';
import { PortsFileService } from '../util/ports.file.service';
import { UpstreamProxyManager } from './upstream.proxy.manager';
import { ConfigStore } from './config.store';
import { ConnectionContextManager } from './connection.context.manager';
import { debug } from '../util/debug';
import axios from 'axios';
import { ConfigController } from './config.controller';

@injectable()
export class CoreServer {

  constructor(private _configServer: ConfigServer,
  private _ntlmProxyServer: NtlmProxyServer,
  private _portsFileService: PortsFileService,
  private _upstreamProxyManager: UpstreamProxyManager,
  private _configStore: ConfigStore,
  private _connectionContextManager: ConnectionContextManager,
  private _configController: ConfigController) {

    this._configController.configApiEvent.addListener('reset', () => this.ntlmConfigReset());
    this._configController.configApiEvent.addListener('quit',
      async (keepPortsFile: boolean) => await this.stop(keepPortsFile));
  }

  async start(allowMultipleInstances: boolean, httpProxy?: string, httpsProxy?: string, noProxy?: string): Promise<PortsFile> {
    await this.stopExistingInstance(allowMultipleInstances);
    this._upstreamProxyManager.init(httpProxy, httpsProxy, noProxy);
    let configApiUrl = await this._configServer.start();
    let ntlmProxyUrl = await this._ntlmProxyServer.start();
    let ports: PortsFile = {
      configApiUrl: configApiUrl,
      ntlmProxyUrl: ntlmProxyUrl
    };
    await this._portsFileService.save(ports);
    return ports;
  }

  async stop(keepPortsFile: boolean) {
    if (keepPortsFile === false) {
      await this._portsFileService.delete();
    }
    this.ntlmConfigReset();
    await this._configServer.stop();
    this._ntlmProxyServer.stop();
    this._upstreamProxyManager.reset();
  }

  private async stopExistingInstance(allowMultipleInstances: boolean) {
    if (this._portsFileService.exists()) {
      if (allowMultipleInstances) {
        debug('Existing proxy instance found, leave it running since multiple instances are allowed');
        return;
      }
      debug('Existing proxy instance found, sending shutdown');
      let ports = this._portsFileService.parse();
      try {
        await axios.post(ports.configApiUrl + '/quit',
        { keepPortsFile: true },
        { timeout: 15000 });
      } catch (err) {
        debug('Quit request failed, trying to delete the ports file: ' + err);
      }
      await this._portsFileService.delete();
    }
  }

  private ntlmConfigReset() {
    this._configStore.clear();
    this._connectionContextManager.removeAllConnectionContexts('reset');
  }

}
