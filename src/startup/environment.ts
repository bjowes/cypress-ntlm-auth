import { injectable } from "inversify";
import { HttpsValidationLevel } from "../models/https.validation.level.enum";
import { PortsConfig } from "../models/ports.config.model";
import { URLExt } from "../util/url.ext";
import { IEnvironment } from "./interfaces/i.environment";

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

  get httpsValidation(): HttpsValidationLevel {
    return this.parseHttpsValidation(process.env.HTTPS_VALIDATION);
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

  validateEnvironmentUrls() {
    if (this.configApiUrl) {
      try {
        new URL(this.configApiUrl);
      } catch (err) {
        throw new Error("cypress-ntlm-auth: URLs in environment variables must be complete (start with http://)." +
        " Invalid URL (CYPRESS_NTLM_AUTH_API): " + this.configApiUrl);
      }
    }
    if (this.ntlmProxyUrl) {
      try {
        new URL(this.ntlmProxyUrl);
      } catch (err) {
        throw new Error("cypress-ntlm-auth: URLs in environment variables must be complete (start with http://)." +
        " Invalid URL (CYPRESS_NTLM_AUTH_PROXY): " + this.ntlmProxyUrl);
      }
    }
  }

  private portFromUrl(value: string | undefined): number | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = new URL(value);
    return URLExt.portOrDefault(parsed);
  }

  private nodeTlsRejectUnauthorized(): boolean {
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
      return process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0";
    }
    return true;
  }

  private parseHttpsValidation(
    httpsValidationEnv: string | undefined
  ): HttpsValidationLevel {
    if (!this.nodeTlsRejectUnauthorized()) {
      console.warn(
        "cypress-ntlm-auth: NODE_TLS_REJECT_UNAUTHORIZED is set to 0. " +
        "This disables all certificate checks and overrides any HTTPS_VALIDATION setting."
      );
      return HttpsValidationLevel.Unsafe;
    }
    if (!httpsValidationEnv) {
      return HttpsValidationLevel.Warn;
    }
    switch (httpsValidationEnv.toLowerCase()) {
      case "strict":
        return HttpsValidationLevel.Strict;
      case "warn":
        return HttpsValidationLevel.Warn;
      case "unsafe":
        return HttpsValidationLevel.Unsafe;
      default: {
        console.error(
          "cypress-ntlm-auth: Invalid HTTPS_VALIDATION value (" +
            httpsValidationEnv +
            '). Valid values are "strict", "warn" or "unsafe". Applying default value "warn"'
        );
        return HttpsValidationLevel.Warn;
      }
    }
  }
}
