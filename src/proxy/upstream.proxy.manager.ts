import { inject, injectable } from "inversify";
import { URLExt } from "../util/url.ext";

import {
  HttpHeaders,
  IUpstreamProxyManager,
} from "./interfaces/i.upstream.proxy.manager";
import { TYPES } from "./dependency.injection.types";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { ExtendedAgentOptions } from "../models/extended.agent.options";

/**
 * Upstream proxy manager
 */
@injectable()
export class UpstreamProxyManager implements IUpstreamProxyManager {
  private _httpProxyUrl?: URL;
  private _httpsProxyUrl?: URL;
  private _noProxyUrls?: string[];
  private _debug: IDebugLogger;

  /**
   * Constructor
   * @param debug Debug logger
   */
  constructor(@inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._debug = debug;
  }

  /**
   * Initializes the manager
   * @param httpProxy Upstream HTTP proxy Url
   * @param httpsProxy Upstream HTTPS proxy Url
   * @param noProxy List of hosts that should not be proxied
   */
  init(httpProxy?: string, httpsProxy?: string, noProxy?: string) {
    if (httpProxy && this.validateUpstreamProxy(httpProxy, "HTTP_PROXY")) {
      this._httpProxyUrl = new URL(httpProxy);
      this._debug.log('Detected HTTP_PROXY:', httpProxy);
    }
    if (httpsProxy && this.validateUpstreamProxy(httpsProxy, "HTTPS_PROXY")) {
      this._httpsProxyUrl = new URL(httpsProxy);
      this._debug.log('Detected HTTPS_PROXY:', httpsProxy);
    }
    if (noProxy) {
      // Might be a comma separated list of hosts
      this._noProxyUrls = noProxy.split(",").map((item) => {
        item = item.trim();
        if (item === '::1') item = '[::1]'; // Add quoting brackets for IPv6 loopback
        if (item.indexOf("*") === -1 && this.validateNoProxyPart(item)) {          
          item = new URL(`http://${item}`).host; // Trim away default ports
        }
        return item;
      });
      this._debug.log('Detected NO_PROXY, parsed:', this._noProxyUrls.join(','));
    }
  }

  private validateUpstreamProxy(proxyUrl: string, parameterName: string) {
    try {
      const proxyParsed = new URL(proxyUrl);
      if (proxyParsed.protocol && proxyParsed.hostname && proxyParsed.pathname === "/") return true;
    } catch (err) {
      this._debug.log("Cannot parse upstream proxy URL", err);
    }
    throw new Error(
      "Invalid " +
        parameterName +
        " argument '" + proxyUrl + "'. " +
        "It must be a complete URL without path. Example: http://proxy.acme.com:8080"
    );
  }

  private validateNoProxyPart(noProxyPart: string) {
    try {
      const proxyParsed = new URL(`http://${noProxyPart}`);
      if (proxyParsed.hostname && proxyParsed.pathname === "/") return true;
    } catch (err) {
      this._debug.log("Cannot parse upstream proxy URL", err);
    }
    throw new Error( 
      "Invalid NO_PROXY argument part '" + noProxyPart + "'. " +
        "It must be a comma separated list of: valid IP, hostname[:port] or a wildcard prefixed hostname. Protocol shall not be included. IPv6 addresses must be quoted in []. Examples: localhost,127.0.0.1,[::1],noproxy.acme.com:8080,*.noproxy.com"
    );
  }

  private matchWithWildcardRule(str: string, rule: string): boolean {
    if (rule.indexOf('*') === -1) return str === rule;
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

  /**
   * Set upstream proxy configuration on an agent
   * @param ntlmHostUrl Target NTLM host
   * @param isSSL Is the connection using SSL
   * @param agentOptions Agent options
   * @returns true if upstream proxying is required
   */
  setUpstreamProxyConfig(ntlmHostUrl: URL, isSSL: boolean, agentOptions: ExtendedAgentOptions) {
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

  /**
   * Check if an upstream proxy is applied for HTTPS for a specified target host
   * @param ntlmHostUrl Target NTLM host
   * @returns true if upstream proxying is required
   */
  hasHttpsUpstreamProxy(ntlmHostUrl: URL): boolean {
    return (
      (this._httpProxyUrl !== undefined || this._httpsProxyUrl !== undefined) &&
      this.targetInNoProxy(ntlmHostUrl) === false
    );
  }

  /**
   * Sets headers in requests for proper signalling with upstream proxy
   * @param headers request headers object
   */
  setUpstreamProxyHeaders(headers: HttpHeaders): void {
    if (headers["connection"] === "keep-alive") {
      headers["proxy-connection"] = "keep-alive";
    }
  }

  /**
   * Reset all settings
   */
  reset() {
    this._httpProxyUrl = undefined;
    this._httpsProxyUrl = undefined;
    this._noProxyUrls = undefined;
  }
}
