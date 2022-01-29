import { CompleteUrl } from "../../models/complete.url.model.js";

export interface IUpstreamProxyManager {
  init(httpProxy?: string, httpsProxy?: string, noProxy?: string): void;
  setUpstreamProxyConfig(ntlmHostUrl: CompleteUrl, isSSL: boolean, agentOptions: any): boolean;
  hasHttpsUpstreamProxy(ntlmHostUrl: CompleteUrl): boolean;
  reset(): void;
}
