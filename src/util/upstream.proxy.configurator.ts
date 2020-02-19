import { TYPES } from "../proxy/dependency.injection.types";
import { inject, injectable } from "inversify";
import { IDebugLogger } from "./interfaces/i.debug.logger";
import { IUpstreamProxyConfigurator } from "./interfaces/i.upstream.proxy.configurator";
import os from "os";

@injectable()
export class UpstreamProxyConfigurator implements IUpstreamProxyConfigurator {
  private _debug: IDebugLogger;
  private _loopbackDisable = "<-loopback>";
  private _noProxyLocalhost = "localhost";
  private _noProxyLoopback = "127.0.0.1";

  constructor(@inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._debug = debug;
  }

  removeUnusedProxyEnv() {
    // Clear potentially existing proxy settings to avoid conflicts in cypress proxy config
    if (os.platform() !== "win32") {
      delete process.env.http_proxy;
      delete process.env.https_proxy;
      delete process.env.no_proxy;
    }
    delete process.env.npm_config_proxy;
    delete process.env.npm_config_https_proxy;
    delete process.env.NPM_CONFIG_PROXY;
    delete process.env.NPM_CONFIG_HTTPS_PROXY;
  }

  processNoProxyLoopback() {
    if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
      const env_no_proxy = process.env.NO_PROXY?.trim();
      if (env_no_proxy && env_no_proxy.indexOf(this._loopbackDisable) !== -1) {
        this._debug.log(
          "NO_PROXY contains '<-loopback>', will not disable localhost proxying"
        );
      } else {
        process.env.NO_PROXY = this.addLoopbackToNoProxy(env_no_proxy);
      }
    }
  }

  private addLoopbackToNoProxy(no_proxy: string | undefined) {
    let no_proxy_parts: string[] = [];
    if (no_proxy) {
      no_proxy_parts = no_proxy.split(",").map(s => s.trim());
    }
    if (no_proxy_parts.indexOf(this._noProxyLocalhost) === -1) {
      this._debug.log(
        "Adding " +
          this._noProxyLocalhost +
          " to NO_PROXY to disable localhost proxying"
      );
      no_proxy_parts.push(this._noProxyLocalhost);
    }
    if (no_proxy_parts.indexOf(this._noProxyLoopback) === -1) {
      this._debug.log(
        "Adding " +
          this._noProxyLoopback +
          " to NO_PROXY to disable localhost proxying"
      );
      no_proxy_parts.push(this._noProxyLoopback);
    }
    return no_proxy_parts.join(",");
  }
}
