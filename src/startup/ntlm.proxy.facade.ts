import { inject, injectable } from "inversify";

import { TYPES } from "../proxy/dependency.injection.types";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { INtlmProxyFacade } from "./interfaces/i.ntlm.proxy.facade";
import { PortsConfig } from "../models/ports.config.model";
import { NtlmConfig } from "../models/ntlm.config.model";
import { NtlmSsoConfig } from "../models/ntlm.sso.config.model";
import { INtlmProxyHttpClient } from "./interfaces/i.ntlm.proxy.http.client";

/**
 * Facade for NTML proxy (internal or external)
 */
@injectable()
export class NtlmProxyFacade implements INtlmProxyFacade {
  private _debug: IDebugLogger;
  private _httpClient: INtlmProxyHttpClient;

  /**
   * Constructor
   * @param debug Debug logger 
   * @param httpClient Interface for http requests
   */
  constructor(@inject(TYPES.IDebugLogger) debug: IDebugLogger,
              @inject(TYPES.INtlmProxyHttpClient) httpClient: INtlmProxyHttpClient) {
    this._debug = debug;
    this._httpClient = httpClient;
  }

  /**
   * Sends alive request to NTLM proxy
   * @param configApiUrl Url to NTLM proxy config endpoint
   * @returns PortsConfig if proxy is alive
   */
  async alive(configApiUrl: string): Promise<PortsConfig> {
    return (await this._httpClient.request(configApiUrl, "alive", "GET", undefined)) as PortsConfig;
  }

  /**
   * Sends config reset request to NTML proxy
   * @param configApiUrl Url to NTLM proxy config endpoint
   */
  async reset(configApiUrl: string) {
    await this._httpClient.request(configApiUrl, "reset", "POST", undefined);
  }

  /**
   * Sends NTLM configuration request to NTLM proxy
   * @param configApiUrl Url to NTLM proxy config endpoint
   * @param ntlmConfig NTLM configuration
   */
  async ntlm(configApiUrl: string, ntlmConfig: NtlmConfig) {
    await this._httpClient.request(configApiUrl, "ntlm-config", "POST", ntlmConfig);
  }

  /**
   * Sends NTLM SSO configuration request to NTLM proxy
   * @param configApiUrl Url to NTLM proxy config endpoint 
   * @param ntlmSsoConfig NTLM SSO configuration
   */
  async ntlmSso(configApiUrl: string, ntlmSsoConfig: NtlmSsoConfig) {
    await this._httpClient.request(configApiUrl, "ntlm-sso", "POST", ntlmSsoConfig);
  }

  /**
   * Sends quit request to NTLM proxy
   * @param configApiUrl Url to NTLM proxy config endpoint 
   * @returns True if request was successful
   */
  async quitIfRunning(configApiUrl?: string): Promise<boolean> {
    if (configApiUrl) {
      (await this._httpClient.request(configApiUrl, "quit", "POST", undefined)) as PortsConfig;
      return true;
    } else {
      this._debug.log("CYPRESS_NTLM_AUTH_API is not set, nothing to do.");
      return false;
    }
  }
}
