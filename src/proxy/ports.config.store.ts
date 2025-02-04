import { injectable } from "inversify";
import { IPortsConfigStore } from "./interfaces/i.ports.config.store";

/**
 * Store for ports config
 */
@injectable()
export class PortsConfigStore implements IPortsConfigStore {
  private _configApiUrl?: URL = undefined;
  private _ntlmProxyUrl?: URL = undefined;

  /**
   * Get NTLM Proxy config API Url
   * @returns NTLM Proxy config API Url
   */
  get configApiUrl(): URL | undefined {
    return this._configApiUrl;
  }

  /**
   * Set NTLM Proxy config API Url
   */
  set configApiUrl(configApiUrl: URL | undefined) {
    this._configApiUrl = configApiUrl;
  }

  /**
   * Get NTLM Proxy proxy Url
   * @returns NTLM Proxy proxy Url
   */
  get ntlmProxyUrl(): URL | undefined {
    return this._ntlmProxyUrl;
  }

  /**
   * Set NTLM Proxy proxy Url
   */
  set ntlmProxyUrl(ntlmProxyUrl: URL | undefined) {
    this._ntlmProxyUrl = ntlmProxyUrl;
  }
}
