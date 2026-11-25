import type { ExtendedAgentOptions } from "../../models/extended.agent.options.ts";

export interface HttpHeaders {
  [key: string]: string;
}

export abstract class IUpstreamProxyManager {
  abstract init(httpProxy?: string, httpsProxy?: string, noProxy?: string): void;
  abstract setUpstreamProxyConfig(ntlmHostUrl: URL, isSSL: boolean, agentOptions: ExtendedAgentOptions): boolean;
  abstract hasHttpsUpstreamProxy(ntlmHostUrl: URL): boolean;
  abstract reset(): void;
  abstract setUpstreamProxyHeaders(headers: HttpHeaders): void;
}
