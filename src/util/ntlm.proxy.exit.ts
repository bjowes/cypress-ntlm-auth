import { TYPES } from "../proxy/dependency.injection.types";
import { inject, injectable } from "inversify";
import { IDebugLogger } from "./interfaces/i.debug.logger";
import axios from "axios";
import { INtlmProxyExit } from "./interfaces/i.ntlm.proxy.exit";

@injectable()
export class NtlmProxyExit implements INtlmProxyExit {
  private _debug: IDebugLogger;

  constructor(@inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._debug = debug;
  }

  private async sendQuitCommand(configApiUrl: string) {
    this._debug.log("ntlm-proxy-exit: Sending shutdown command to NTLM proxy");

    try {
      let res = await axios.post(
        configApiUrl + "/quit",
        { keepPortsFile: false },
        { timeout: 5000 }
      );
      if (res.status !== 200) {
        this._debug.log(
          "ntlm-proxy-exit: Unexpected response from NTLM proxy: " + res.status
        );
        throw new Error("Unexpected response from NTLM proxy: " + res.status);
      }
      this._debug.log("ntlm-proxy-exit: Shutdown successful");
    } catch (err) {
      this._debug.log("ntlm-proxy-exit: Shutdown request failed: " + err);
      throw new Error("Shutdown request failed: " + err);
    }
  }

  async quitIfRunning(configApiUrl?: string) {
    if (configApiUrl) {
      await this.sendQuitCommand(configApiUrl);
    } else {
      this._debug.log(
        "ntlm-proxy-exit: CYPRESS_NTLM_AUTH_API is not set, nothing to do."
      );
    }
  }
}
