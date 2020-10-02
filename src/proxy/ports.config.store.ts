import { injectable } from "inversify";
import { IPortsConfigStore } from "./interfaces/i.ports.config.store";

@injectable()
export class PortsConfigStore implements IPortsConfigStore {
  private _configApiUrl = "";
  private _ntlmProxyUrl = "";
  private _ntlmProxyPort = "";

  get configApiUrl(): string {
    return this._configApiUrl;
  }

  set configApiUrl(configApiUrl: string) {
    this._configApiUrl = configApiUrl;
  }

  get ntlmProxyUrl(): string {
    return this._ntlmProxyUrl;
  }

  set ntlmProxyUrl(ntlmProxyUrl: string) {
    this._ntlmProxyUrl = ntlmProxyUrl;
  }

  get ntlmProxyPort(): string {
    return this._ntlmProxyPort;
  }

  set ntlmProxyPort(ntlmProxyPort: string) {
    this._ntlmProxyPort = ntlmProxyPort;
  }
}
