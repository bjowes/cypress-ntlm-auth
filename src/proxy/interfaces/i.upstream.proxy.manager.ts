import { URLExt } from "../../util/url.ext.js";

export interface HttpHeaders {
  [key: string]: string;
}

export interface IUpstreamProxyManager {
  init(httpProxy?: string, httpsProxy?: string, noProxy?: string): void;
  setUpstreamProxyConfig(ntlmHostUrl: URLExt, isSSL: boolean, agentOptions: any): boolean;
  hasHttpsUpstreamProxy(ntlmHostUrl: URLExt): boolean;
  reset(): void;
  setUpstreamProxyHeaders(headers: HttpHeaders): void;
}
