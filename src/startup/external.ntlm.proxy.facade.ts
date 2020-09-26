import { TYPES } from "../proxy/dependency.injection.types";
import { inject, injectable } from "inversify";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import http from "http";
import url from "url";
import { IExternalNtlmProxyFacade } from "./interfaces/i.external.ntlm.proxy.facade";

@injectable()
export class ExternalNtlmProxyFacade implements IExternalNtlmProxyFacade {
  private _debug: IDebugLogger;

  constructor(@inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._debug = debug;
  }

  private async sendAliveCommand(configApiUrl: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this._debug.log("Sending alive request to NTLM proxy");

      const configApiUrlParsed = url.parse(configApiUrl);
      const options: http.RequestOptions = {
        hostname: configApiUrlParsed.hostname,
        port: configApiUrlParsed.port,
        path: "/alive",
        method: "GET",
        timeout: 3000,
      };
      const req = http.request(options, (res) => {
        if (res.statusCode !== 200) {
          this._debug.log(
            "Unexpected response from NTLM proxy: " + res.statusCode
          );
          this._debug.log("Alive request failed");
          return reject(
            "Unexpected response from NTLM proxy: " + res.statusCode
          );
        }
        this._debug.log("NTLM proxy is alive");
        return resolve(true);
      });

      req.on("error", (error) => {
        this._debug.log("Alive request failed");
        return reject(
          "An error occured while communicating with NTLM proxy: " +
            error.message
        );
      });
      req.end();
    });
  }

  private async sendQuitCommand(configApiUrl: string) {
    return new Promise((resolve, reject) => {
      this._debug.log("Sending shutdown command to NTLM proxy");

      const configApiUrlParsed = url.parse(configApiUrl);
      const options: http.RequestOptions = {
        hostname: configApiUrlParsed.hostname,
        port: configApiUrlParsed.port,
        path: "/quit",
        method: "POST",
        timeout: 5000,
      };
      const req = http.request(options, (res) => {
        if (res.statusCode !== 200) {
          this._debug.log(
            "Unexpected response from NTLM proxy: " + res.statusCode
          );
          this._debug.log("Shutdown request failed");
          return reject(
            "Unexpected response from NTLM proxy: " + res.statusCode
          );
        }
        this._debug.log("Shutdown successful");
        return resolve();
      });

      req.on("error", (error) => {
        this._debug.log("Shutdown request failed");
        return reject(
          "An error occured while communicating with NTLM proxy: " +
            error.message
        );
      });
      req.end();
    });
  }

  async isAlive(configApiUrl: string) {
    return await this.sendAliveCommand(configApiUrl);
  }

  async quitIfRunning(configApiUrl?: string) {
    if (configApiUrl) {
      await this.sendQuitCommand(configApiUrl);
    } else {
      this._debug.log("CYPRESS_NTLM_AUTH_API is not set, nothing to do.");
    }
  }
}
