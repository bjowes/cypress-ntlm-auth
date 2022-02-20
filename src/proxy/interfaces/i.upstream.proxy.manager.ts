export interface HttpHeaders {
  [key: string]: string;
}

export interface IUpstreamProxyManager {
  init(httpProxy?: string, httpsProxy?: string, noProxy?: string): void;
  setUpstreamProxyConfig(ntlmHostUrl: URL, isSSL: boolean, agentOptions: any): boolean;
  hasHttpsUpstreamProxy(ntlmHostUrl: URL): boolean;
  reset(): void;
  setUpstreamProxyHeaders(headers: HttpHeaders): void;
}
