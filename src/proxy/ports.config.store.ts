import { injectable } from "inversify";
import { URLExt } from "../util/url.ext.js";
import { IPortsConfigStore } from "./interfaces/i.ports.config.store.js";

@injectable()
export class PortsConfigStore implements IPortsConfigStore {
  private _configApiUrl?: URLExt = undefined;
  private _ntlmProxyUrl?: URLExt = undefined;

  get configApiUrl(): URLExt | undefined {
    return this._configApiUrl;
  }

  set configApiUrl(configApiUrl: URLExt | undefined) {
    this._configApiUrl = configApiUrl;
  }

  get ntlmProxyUrl(): URLExt | undefined {
    return this._ntlmProxyUrl;
  }

  set ntlmProxyUrl(ntlmProxyUrl: URLExt | undefined) {
    this._ntlmProxyUrl = ntlmProxyUrl;
  }
}
