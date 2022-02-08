import { injectable } from "inversify";
import { PortsConfig } from "../models/ports.config.model.js";
import { IEnvironment } from "./interfaces/i.environment.js";

@injectable()
export class Environment implements IEnvironment {
  private readonly _loopbackDisable = "<-loopback>";

  get configApiUrl(): string | undefined {
    return process.env.CYPRESS_NTLM_AUTH_API;
  }

  set configApiUrl(configApiUrl: string | undefined) {
    process.env.CYPRESS_NTLM_AUTH_API = configApiUrl;
  }

  get configApiPort(): number | undefined {
    return this.portFromUrl(this.configApiUrl);
  }

  get ntlmProxyUrl(): string | undefined {
    return process.env.CYPRESS_NTLM_AUTH_PROXY;
  }

  set ntlmProxyUrl(ntlmProxyUrl: string | undefined) {
    process.env.CYPRESS_NTLM_AUTH_PROXY = ntlmProxyUrl;
  }

  get ntlmProxyPort(): number | undefined {
    return this.portFromUrl(this.ntlmProxyUrl);
  }

  get httpProxy(): string | undefined {
    return process.env.HTTP_PROXY;
  }

  set httpProxy(httpProxy: string | undefined) {
    process.env.HTTP_PROXY = httpProxy;
  }

  get httpsProxy(): string | undefined {
    return process.env.HTTPS_PROXY;
  }

  set httpsProxy(httpsProxy: string | undefined) {
    process.env.HTTPS_PROXY = httpsProxy;
  }

  get noProxy(): string | undefined {
    return process.env.NO_PROXY;
  }

  set noProxy(noProxy: string | undefined) {
    process.env.NO_PROXY = noProxy;
  }

  configureForCypress(ports: PortsConfig) {
    this.configApiUrl = ports.configApiUrl;
    this.ntlmProxyUrl = ports.ntlmProxyUrl;
    this.httpProxy = ports.ntlmProxyUrl;
    this.httpsProxy = ports.ntlmProxyUrl;
    this.noProxy = this._loopbackDisable;
  }

  delete(key: string) {
    delete process.env[key];
  }

  private portFromUrl(value: string | undefined): number | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = new URL(value);
    if (!parsed.port) {
      return undefined;
    }
    return +parsed.port;
  }
}
