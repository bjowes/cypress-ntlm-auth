import { injectable } from "inversify";
import { HttpsValidationLevel } from "../models/https.validation.level.enum";
import { PortsConfig } from "../models/ports.config.model";
import { URLExt } from "../util/url.ext";
import { IEnvironment } from "./interfaces/i.environment";

/**
 * Environment variable accessor
 */
@injectable()
export class Environment implements IEnvironment {
  private readonly _loopbackDisable = "<-loopback>";

  /**
   * Get NTML Proxy config API url
   * @returns NTML Proxy config API url
   */
  get configApiUrl(): string | undefined {
    return process.env.CYPRESS_NTLM_AUTH_API;
  }

  /**
   * Set NTML Proxy config API url
   */
  set configApiUrl(configApiUrl: string | undefined) {
    process.env.CYPRESS_NTLM_AUTH_API = configApiUrl;
  }

  /**
   * Get NTML Proxy config API port
   * @returns NTML Proxy config API port
   */
  get configApiPort(): number | undefined {
    return this.portFromUrl(this.configApiUrl);
  }

  /**
   * Get NTML Proxy proxy url
   * @returns NTML Proxy proxy url
   */
  get ntlmProxyUrl(): string | undefined {
    return process.env.CYPRESS_NTLM_AUTH_PROXY;
  }

  /**
   * Set NTML Proxy proxy url
   */
  set ntlmProxyUrl(ntlmProxyUrl: string | undefined) {
    process.env.CYPRESS_NTLM_AUTH_PROXY = ntlmProxyUrl;
  }

  /**
   * Get NTML Proxy proxy port
   * @returns NTML Proxy proxy port
   */
  get ntlmProxyPort(): number | undefined {
    return this.portFromUrl(this.ntlmProxyUrl);
  }

  /**
   * Get HTTP_PROXY
   * @returns HTTP_PROXY
   */
  get httpProxy(): string | undefined {
    return process.env.HTTP_PROXY;
  }

  /**
   * Set HTTP_PROXY
   */
  set httpProxy(httpProxy: string | undefined) {
    process.env.HTTP_PROXY = httpProxy;
  }

  /**
   * Get HTTPS_PROXY
   * @returns HTTPS_PROXY
   */
  get httpsProxy(): string | undefined {
    return process.env.HTTPS_PROXY;
  }

  /**
   * Set HTTP_PROXY
   */
  set httpsProxy(httpsProxy: string | undefined) {
    process.env.HTTPS_PROXY = httpsProxy;
  }

  /**
   * Get NO_PROXY
   * @returns NO_PROXY
   */
  get noProxy(): string | undefined {
    return process.env.NO_PROXY;
  }

  /**
   * Set NO_PROXY
   */
  set noProxy(noProxy: string | undefined) {
    process.env.NO_PROXY = noProxy;
  }

  /**
   * Get HTTPS validation level
   * @returns HTTPS validation level
   */
  get httpsValidation(): HttpsValidationLevel {
    return this.parseHttpsValidation(process.env.HTTPS_VALIDATION);
  }

  /**
   * Sets environment variables for Cypress to setup proxying through the NTLM proxy
   * @param ports Ports config
   */
  configureForCypress(ports: PortsConfig) {
    this.configApiUrl = ports.configApiUrl;
    this.ntlmProxyUrl = ports.ntlmProxyUrl;
    this.httpProxy = ports.ntlmProxyUrl;
    this.httpsProxy = ports.ntlmProxyUrl;
    this.noProxy = this._loopbackDisable;
  }

  /**
   * Delete an environment variable
   * @param key Environment variable name
   */
  delete(key: string) {
    delete process.env[key];
  }

  /**
   * Validate the contents of config API url and NTLM Proxy url variables (must be proper http:// URLs if set)
   */
  validateEnvironmentUrls() {
    if (this.configApiUrl) {
      try {
        new URL(this.configApiUrl);
      } catch {
        throw new Error("cypress-ntlm-auth: URLs in environment variables must be complete (start with http://)." +
        " Invalid URL (CYPRESS_NTLM_AUTH_API): " + this.configApiUrl);
      }
    }
    if (this.ntlmProxyUrl) {
      try {
        new URL(this.ntlmProxyUrl);
      } catch {
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
