import url from 'url';

import { CompleteUrl } from "../models/complete.url.model";
import { toCompleteUrl } from '../util/url.converter';
import { injectable } from 'inversify';

@injectable()
export class UpstreamProxyManager {
  private _httpProxyUrl?: CompleteUrl;
  private _httpsProxyUrl?: CompleteUrl;
  private _noProxyUrls?: string[];

  init(httpProxy?: string, httpsProxy?: string, noProxy?: string) {
    if (httpProxy && this.validateUpstreamProxy(httpProxy, 'HTTP_PROXY')) {
      this._httpProxyUrl = toCompleteUrl(httpProxy, false);
    }
    if (httpsProxy && this.validateUpstreamProxy(httpsProxy, 'HTTPS_PROXY')) {
      this._httpsProxyUrl = toCompleteUrl(httpsProxy, false);
    }
    if (noProxy) { // Might be a comma separated list of hosts
      this._noProxyUrls = noProxy.split(',').map(item => item.trim());
    }
  }

  private validateUpstreamProxy(proxyUrl: string, parameterName: string) {
    let proxyParsed = url.parse(proxyUrl);
    if (!proxyParsed.protocol || !proxyParsed.hostname || !proxyParsed.port || proxyParsed.path !== '/') {
      throw new Error('Invalid ' + parameterName + ' argument. It must be a complete URL without path. Example: http://proxy.acme.com:8080');
    }
    return true;
  }

  private matchWithWildcardRule(str: string, rule: string): boolean {
    return new RegExp('^' + rule.split('*').join('.*') + '$').test(str);
  }

  private targetInNoProxy(ntlmHostUrl: CompleteUrl) {
    if (!this._noProxyUrls) {
      return false;
    }

    let match = false;
    this._noProxyUrls.forEach(rule => {
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
    } else if (!isSSL && this._httpProxyUrl) {
      proxyUrl = this._httpProxyUrl;
    }
    if (proxyUrl) {
      agentOptions.host = proxyUrl.hostname;
      agentOptions.port = +proxyUrl.port;
      agentOptions.secureProxy = (proxyUrl.protocol === 'https:');
      return true;
    }
    return false;
  }

  hasHttpsUpstreamProxy(): boolean {
    return this._httpsProxyUrl !== undefined;
  }

  reset() {
    this._httpProxyUrl = undefined;
    this._httpsProxyUrl = undefined;
    this._noProxyUrls = undefined;
  }
};
