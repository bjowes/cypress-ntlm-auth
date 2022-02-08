import { injectable } from "inversify";
import { IPortsConfigStore } from "./interfaces/i.ports.config.store.js";

@injectable()
export class PortsConfigStore implements IPortsConfigStore {
  private _configApiUrl?: URL = undefined;
  private _ntlmProxyUrl?: URL = undefined;

  get configApiUrl(): URL | undefined {
    return this._configApiUrl;
  }

  set configApiUrl(configApiUrl: URL | undefined) {
    this._configApiUrl = configApiUrl;
  }

  get ntlmProxyUrl(): URL | undefined {
    return this._ntlmProxyUrl;
  }

  set ntlmProxyUrl(ntlmProxyUrl: URL | undefined) {
    this._ntlmProxyUrl = ntlmProxyUrl;
  }
}
