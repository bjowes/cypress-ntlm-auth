import os from "os";
import { inject, injectable } from "inversify";

import { TYPES } from "../proxy/dependency.injection.types.js";
import { IDebugLogger } from "../util/interfaces/i.debug.logger.js";
import { IUpstreamProxyConfigurator } from "./interfaces/i.upstream.proxy.configurator.js";
import { IEnvironment } from "./interfaces/i.environment.js";

@injectable()
export class UpstreamProxyConfigurator implements IUpstreamProxyConfigurator {
  private readonly _environment: IEnvironment;
  private readonly _debug: IDebugLogger;
  private readonly _loopbackDisable = "<-loopback>";
  private readonly _noProxyLocalhost = "localhost";
  private readonly _noProxyLoopback = "127.0.0.1";

  constructor(@inject(TYPES.IEnvironment) environment: IEnvironment, @inject(TYPES.IDebugLogger) debug: IDebugLogger) {
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
      const envNoProxy = this._environment.noProxy?.trim();
      if (envNoProxy && envNoProxy.indexOf(this._loopbackDisable) !== -1) {
        this._debug.log("NO_PROXY contains '<-loopback>', will not disable localhost proxying");
      } else {
        this._environment.noProxy = this.addLoopbackToNoProxy(envNoProxy);
      }
    }
  }

  private addLoopbackToNoProxy(noProxy: string | undefined) {
    let noProxyParts: string[] = [];
    if (noProxy) {
      noProxyParts = noProxy.split(",").map((s) => s.trim());
    }
    if (noProxyParts.indexOf(this._noProxyLocalhost) === -1) {
      this._debug.log("Adding " + this._noProxyLocalhost + " to NO_PROXY to disable localhost proxying");
      noProxyParts.push(this._noProxyLocalhost);
    }
    if (noProxyParts.indexOf(this._noProxyLoopback) === -1) {
      this._debug.log("Adding " + this._noProxyLoopback + " to NO_PROXY to disable loopback proxying");
      noProxyParts.push(this._noProxyLoopback);
    }
    return noProxyParts.join(",");
  }
}
