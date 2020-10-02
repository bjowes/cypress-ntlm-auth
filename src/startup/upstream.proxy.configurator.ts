import { TYPES } from "../proxy/dependency.injection.types";
import { inject, injectable } from "inversify";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { IUpstreamProxyConfigurator } from "./interfaces/i.upstream.proxy.configurator";
import os from "os";
import { IEnvironment } from "./interfaces/i.environment";

@injectable()
export class UpstreamProxyConfigurator implements IUpstreamProxyConfigurator {
  private readonly _environment: IEnvironment;
  private readonly _debug: IDebugLogger;
  private readonly _loopbackDisable = "<-loopback>";
  private readonly _noProxyLocalhost = "localhost";
  private readonly _noProxyLoopback = "127.0.0.1";

  constructor(
    @inject(TYPES.IEnvironment) environment: IEnvironment,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger
  ) {
    this._environment = environment;
    this._debug = debug;
  }

  removeUnusedProxyEnv() {
    // Clear potentially existing proxy settings to avoid conflicts in cypress proxy config
    if (os.platform() !== "win32") {
      this._environment.delete("http_proxy");
      this._environment.delete("https_proxy");
      this._environment.delete("no_proxy");
    }
    this._environment.delete("npm_config_proxy");
    this._environment.delete("npm_config_https_proxy");
    this._environment.delete("NPM_CONFIG_PROXY");
    this._environment.delete("NPM_CONFIG_HTTPS_PROXY");
  }

  processNoProxyLoopback() {
    if (this._environment.httpProxy) {
      const env_no_proxy = this._environment.noProxy?.trim();
      if (env_no_proxy && env_no_proxy.indexOf(this._loopbackDisable) !== -1) {
        this._debug.log(
          "NO_PROXY contains '<-loopback>', will not disable localhost proxying"
        );
      } else {
        this._environment.noProxy = this.addLoopbackToNoProxy(env_no_proxy);
      }
    }
  }

  private addLoopbackToNoProxy(no_proxy: string | undefined) {
    let no_proxy_parts: string[] = [];
    if (no_proxy) {
      no_proxy_parts = no_proxy.split(",").map((s) => s.trim());
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
          " to NO_PROXY to disable loopback proxying"
      );
      no_proxy_parts.push(this._noProxyLoopback);
    }
    return no_proxy_parts.join(",");
  }
}
