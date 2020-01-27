import { IPortsFileService } from "./interfaces/i.ports.file.service";
import { TYPES } from "../proxy/dependency.injection.types";
import { inject, injectable } from "inversify";
import { IDebugLogger } from "./interfaces/i.debug.logger";
import axios from "axios";
import { ICypressNtlm } from "./interfaces/i.cypress.ntlm";
import { PortsFile } from "../models/ports.file.model";

let self: CypressNtlm;

@injectable()
export class CypressNtlm implements ICypressNtlm {
  private _portsFileService: IPortsFileService;
  private _debug: IDebugLogger;

  constructor(
    @inject(TYPES.IPortsFileService) portsFileService: IPortsFileService,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger
  ) {
    this._portsFileService = portsFileService;
    this._debug = debug;

    // Keep track of instance handle since we need it when responding to timer events
    self = this;
  }

  checkCypressIsInstalled(): boolean {
    try {
      const result = require.resolve("cypress");
      return result !== null && result !== undefined;
    } catch {
      return false;
    }
  }

  checkProxyIsRunning(timeout: number, interval: number): Promise<PortsFile> {
    return new Promise((resolve, reject) => {
      const timeoutTimerId = global.setTimeout(handleTimeout, timeout);
      let intervalTimerId: NodeJS.Timeout;

      function handleTimeout() {
        clearTimeout(intervalTimerId);
        const error = new Error("ntlm-proxy not found before timed out");
        error.name = "PATH_CHECK_TIMED_OUT";
        reject(error);
      }

      function handleInterval() {
        if (self._portsFileService.exists()) {
          try {
            const portsFile = self._portsFileService.parse();
            axios
              .get(portsFile.configApiUrl + "/alive", { timeout: 1000 })
              .then(res => {
                if (res.status === 200) {
                  clearTimeout(timeoutTimerId);
                  self._debug.log("Found running ntlm-proxy!");
                  resolve(portsFile);
                } else {
                  self._debug.log(
                    "Invalid response from ntlm-proxy. May just have been removed. Retrying..."
                  );
                  intervalTimerId = global.setTimeout(handleInterval, interval);
                }
              })
              .catch(() => {
                self._debug.log(
                  "Failed to contact ntlm-proxy. May just have been removed. Retrying..."
                );
                intervalTimerId = global.setTimeout(handleInterval, interval);
              });
          } catch (err) {
            // Intentionally ignore
            self._debug.log(
              "Failed to parse ports file. May just have been removed. Retrying..."
            );
            intervalTimerId = global.setTimeout(handleInterval, interval);
          }
        } else {
          intervalTimerId = global.setTimeout(handleInterval, interval);
        }
      }

      if (self._portsFileService.recentlyModified()) {
        // Ports file is fresh => ntlm-proxy recently started
        handleInterval();
      } else {
        // Older ports file => old ntlm-proxy instance still running or failed to cleanup
        // Wait 2000 ms to avoid finding an old proxy instance
        self._debug.log(
          "Older ports file present. Waiting 2000 ms for new proxy instance to remove it."
        );
        intervalTimerId = global.setTimeout(handleInterval, 2000);
      }
    });
  }
}
