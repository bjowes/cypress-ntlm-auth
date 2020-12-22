import { PortsConfig } from "./models/ports.config.model";
import { NtlmConfig } from "./models/ntlm.config.model";
import { NtlmSsoConfig } from "./models/ntlm.sso.config.model";
import { INtlmProxyFacade } from "./startup/interfaces/i.ntlm.proxy.facade";

export class NtlmProxy {
  ports: PortsConfig;
  private ntlmProxyFacade: INtlmProxyFacade;

  constructor(ports: PortsConfig, ntlmProxyFacade: INtlmProxyFacade) {
    this.ports = ports;
    this.ntlmProxyFacade = ntlmProxyFacade;
  }

  /**
   * Add NTLM configuration
   *
   * @param {NtlmConfig} config The NtlmConfig to apply, see the README for details
   */
  async ntlm(config: NtlmConfig) {
    await this.ntlmProxyFacade.ntlm(this.ports.configApiUrl, config);
  }
  /**
   * Add NTLM SSO configuration
   *
   * @param {NtlmSsoConfig} config The NtlmSsoConfig to apply, see the README for details
   */
  async ntlmSso(config: NtlmSsoConfig) {
    await this.ntlmProxyFacade.ntlmSso(this.ports.configApiUrl, config);
  }
  /**
   * Reset connections and configuration
   */
  async reset() {
    await this.ntlmProxyFacade.reset(this.ports.configApiUrl);
  }
  /**
   * Check if proxy is alive
   *
   * @returns {PortsConfig} The PortsConfig for the proxy
   */
  async alive(): Promise<PortsConfig> {
    return await this.ntlmProxyFacade.alive(this.ports.configApiUrl);
  }
  /**
   * Stops ntlm-proxy
   *
   * @returns {boolean} True if the proxy was stopped, false if there was not response or the proxy does not exist.
   */
  async stop(): Promise<boolean> {
    const result = await this.ntlmProxyFacade.quitIfRunning(
      this.ports.configApiUrl
    );
    this.ports.configApiUrl = "";
    this.ports.ntlmProxyUrl = "";
    return result;
  }
}
