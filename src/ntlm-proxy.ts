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
   */
  async ntlm(config: NtlmConfig) {
    await this.ntlmProxyFacade.ntlm(this.ports.configApiUrl, config);
  }
  /**
   * Add NTLM SSO configuration
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
   */
  async alive() {
    await this.ntlmProxyFacade.alive(this.ports.configApiUrl);
  }
  /**
   * Stops ntlm-proxy
   */
  async stop() {
    await this.ntlmProxyFacade.quitIfRunning(this.ports.configApiUrl);
    this.ports.configApiUrl = "";
    this.ports.ntlmProxyUrl = "";
  }
}
