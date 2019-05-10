
import { IPortsFileService } from "./interfaces/i.ports.file.service";
import { TYPES } from "../proxy/dependency.injection.types";
import { inject, injectable } from "inversify";
import { IDebugLogger } from "./interfaces/i.debug.logger";
import axios from 'axios';
import { INtlmProxyExit } from "./interfaces/i.ntlm.proxy.exit";

@injectable()
export class NtlmProxyExit implements INtlmProxyExit {
  private _portsFileService: IPortsFileService;
  private _debug: IDebugLogger;

  constructor(
    @inject(TYPES.IPortsFileService) portsFileService: IPortsFileService,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._portsFileService = portsFileService;
    this._debug = debug;
  }

  private async sendQuitCommand(configApiUrl: string) {
    this._debug.log('ntlm-proxy-exit: Sending shutdown command to NTLM proxy');

    try {
      let res = await axios.post(configApiUrl + '/quit',
      { keepPortsFile: false }, { timeout: 5000 });
      if (res.status !== 200) {
        this._debug.log('ntlm-proxy-exit: Unexpected response from NTLM proxy: ' + res.status);
        throw new Error('Unexpected response from NTLM proxy: ' + res.status);
      }
      this._debug.log('ntlm-proxy-exit: Shutdown successful');
    } catch (err) {
      this._debug.log('ntlm-proxy-exit: Shutdown request failed: ' + err);
      throw new Error('Shutdown request failed: ' + err);
    }
  }

  async quitIfRunning() {
    if (this._portsFileService.exists()) {
      const portsFile = this._portsFileService.parse();
      await this.sendQuitCommand(portsFile.configApiUrl);
    } else {
      this._debug.log('ntlm-proxy-exit: ntlm-proxy is not running, nothing to do.');
    }
  }
}
