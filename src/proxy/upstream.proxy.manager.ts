import * as url from "url";
import { injectable } from "inversify";

import { CompleteUrl } from "../models/complete.url.model.js";
import { toCompleteUrl } from "../util/url.converter.js";
import { IUpstreamProxyManager } from "./interfaces/i.upstream.proxy.manager.js";

@injectable()
export class UpstreamProxyManager implements IUpstreamProxyManager {
  private _httpProxyUrl?: CompleteUrl;
  private _httpsProxyUrl?: CompleteUrl;
  private _noProxyUrls?: string[];

  init(httpProxy?: string, httpsProxy?: string, noProxy?: string) {
    if (httpProxy && this.validateUpstreamProxy(httpProxy, "HTTP_PROXY")) {
      this._httpProxyUrl = toCompleteUrl(httpProxy, false);
    }
    if (httpsProxy && this.validateUpstreamProxy(httpsProxy, "HTTPS_PROXY")) {
      this._httpsProxyUrl = toCompleteUrl(httpsProxy, false);
    }
    if (noProxy) {
      // Might be a comma separated list of hosts
      this._noProxyUrls = noProxy.split(",").map((item) => item.trim());
    }
  }

  private validateUpstreamProxy(proxyUrl: string, parameterName: string) {
    const proxyParsed = url.parse(proxyUrl);
    if (!proxyParsed.protocol || !proxyParsed.hostname || !proxyParsed.port || proxyParsed.path !== "/") {
      throw new Error(
        "Invalid " +
          parameterName +
          " argument. " +
          "It must be a complete URL without path. Example: http://proxy.acme.com:8080"
      );
    }
    return true;
  }

  private matchWithWildcardRule(str: string, rule: string): boolean {
    return new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
  }

  private targetInNoProxy(ntlmHostUrl: CompleteUrl) {
    if (!this._noProxyUrls) {
      return false;
    }

    let match = false;
    this._noProxyUrls.forEach((rule) => {
      if (this.matchWithWildcardRule(ntlmHostUrl.hostname, rule)) {
        match = true;
      }
    });
    return match;
  }

  setUpstreamProxyConfig(ntlmHostUrl: CompleteUrl, isSSL: boolean, agentOptions: any) {
    let proxyUrl = null;

    if (this.targetInNoProxy(ntlmHostUrl)) {
      return false;
    }
    if (isSSL && this._httpsProxyUrl) {
      proxyUrl = this._httpsProxyUrl;
    } else if (this._httpProxyUrl) {
      // Use HTTP_PROXY also for HTTPS if no HTTPS_PROXY is defined
      proxyUrl = this._httpProxyUrl;
    }
    if (proxyUrl) {
      agentOptions.host = proxyUrl.hostname;
      agentOptions.port = +proxyUrl.port;
      agentOptions.secureProxy = proxyUrl.protocol === "https:";
      return true;
    }
    return false;
  }

  hasHttpsUpstreamProxy(ntlmHostUrl: CompleteUrl): boolean {
    return (
      (this._httpProxyUrl !== undefined || this._httpsProxyUrl !== undefined) &&
      this.targetInNoProxy(ntlmHostUrl) === false
    );
  }

  reset() {
    this._httpProxyUrl = undefined;
    this._httpsProxyUrl = undefined;
    this._noProxyUrls = undefined;
  }
}
