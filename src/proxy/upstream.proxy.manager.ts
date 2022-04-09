import { injectable } from "inversify";
import { URLExt } from "../util/url.ext";

import {
  HttpHeaders,
  IUpstreamProxyManager,
} from "./interfaces/i.upstream.proxy.manager";

@injectable()
export class UpstreamProxyManager implements IUpstreamProxyManager {
  private _httpProxyUrl?: URL;
  private _httpsProxyUrl?: URL;
  private _noProxyUrls?: string[];

  init(httpProxy?: string, httpsProxy?: string, noProxy?: string) {
    if (httpProxy && this.validateUpstreamProxy(httpProxy, "HTTP_PROXY")) {
      this._httpProxyUrl = new URL(httpProxy);
    }
    if (httpsProxy && this.validateUpstreamProxy(httpsProxy, "HTTPS_PROXY")) {
      this._httpsProxyUrl = new URL(httpsProxy);
    }
    if (noProxy) {
      // Might be a comma separated list of hosts
      this._noProxyUrls = noProxy.split(",").map((item) => {
        item = item.trim();
        if (item.indexOf("*") === -1) {
          item = new URL(`http://${item}`).host; // Trim away default ports
        }
        return item;
      });
    }
  }

  private validateUpstreamProxy(proxyUrl: string, parameterName: string) {
    const proxyParsed = new URL(proxyUrl);
    if (
      !proxyParsed.protocol ||
      !proxyParsed.hostname ||
      proxyParsed.pathname !== "/"
    ) {
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

  private targetInNoProxy(ntlmHostUrl: URL) {
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

  setUpstreamProxyConfig(ntlmHostUrl: URL, isSSL: boolean, agentOptions: any) {
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
      if (isSSL) {
        agentOptions.proxy = {
          host: URLExt.unescapeHostname(proxyUrl),
          port: URLExt.portOrDefault(proxyUrl),
          secureProxy: proxyUrl.protocol === "https:",
        };
      } else {
        agentOptions.host = URLExt.unescapeHostname(proxyUrl);
        agentOptions.port = URLExt.portOrDefault(proxyUrl);
        agentOptions.secureProxy = proxyUrl.protocol === "https:";
      }
      return true;
    }
    return false;
  }

  hasHttpsUpstreamProxy(ntlmHostUrl: URL): boolean {
    return (
      (this._httpProxyUrl !== undefined || this._httpsProxyUrl !== undefined) &&
      this.targetInNoProxy(ntlmHostUrl) === false
    );
  }

  setUpstreamProxyHeaders(headers: HttpHeaders): void {
    if (headers["connection"] === "keep-alive") {
      headers["proxy-connection"] = "keep-alive";
    }
  }

  reset() {
    this._httpProxyUrl = undefined;
    this._httpsProxyUrl = undefined;
    this._noProxyUrls = undefined;
  }
}
