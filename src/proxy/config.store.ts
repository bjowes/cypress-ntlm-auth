import { NtlmConfig } from "../models/ntlm.config.model";
import { injectable } from "inversify";
import { IConfigStore } from "./interfaces/i.config.store";
import { NtlmSsoConfig } from "../models/ntlm.sso.config.model";
import { NtlmHost } from "../models/ntlm.host.model";
import { NtlmWildcardHost } from "../models/ntlm.wildcard.host.model";
import { URLExt } from "../util/url.ext";

interface NtlmHostConfigHash {
  [ntlmHost: string]: NtlmHost;
}

interface NtlmWildcardHostConfigHash {
  [ntlmHost: string]: NtlmWildcardHost;
}

/**
 * Config store
 */
@injectable()
export class ConfigStore implements IConfigStore {
  private ntlmHosts: NtlmHostConfigHash = {};
  private ntlmHostWildcards: NtlmWildcardHostConfigHash = {};
  private ntlmSsoHosts: string[] = [];
  private ntlmSsoHostWildcards: RegExp[] = [];

  /**
   * Update config from NTLM configuration request
   * @param config NTLM config
   */
  updateConfig(config: NtlmConfig) {
    const nonWildcards = config.ntlmHosts.filter((s) => s.indexOf("*") === -1);
    const wildcards = config.ntlmHosts.filter((s) => s.indexOf("*") !== -1);
    nonWildcards.forEach((host) => {
      const hostConfig: NtlmHost = {
        ntlmHost: new URL(`http://${host}`).host, // Trims away default ports
        username: config.username,
        password: config.password,
        domain: config.domain ? config.domain.toUpperCase() : undefined,
        workstation: config.workstation
          ? config.workstation.toUpperCase()
          : undefined,
        ntlmVersion: config.ntlmVersion,
      };
      this.ntlmHosts[host] = hostConfig;
    });
    wildcards.forEach((wildcard) => {
      const hostConfig: NtlmWildcardHost = {
        ntlmHost: wildcard,
        ntlmHostRegex: new RegExp(`^${wildcard.replace(/\*/g, ".*")}$`, "i"),
        username: config.username,
        password: config.password,
        domain: config.domain ? config.domain.toUpperCase() : undefined,
        workstation: config.workstation
          ? config.workstation.toUpperCase()
          : undefined,
        ntlmVersion: config.ntlmVersion,
      };
      this.ntlmHostWildcards[wildcard] = hostConfig;
    });
  }

  /**
   * Check if target Url exists in config
   * @param ntlmHostUrl Target Url
   * @returns true if target Url exists in config
   */
  exists(ntlmHostUrl: URL): boolean {
    return this.get(ntlmHostUrl) !== undefined;
  }

  /**
   * Get config for target Url
   * @param ntlmHostUrl Target Url
   * @returns Config if it exists
   */
  get(ntlmHostUrl: URL): NtlmHost | undefined {
    // Match first with port
    const ntlmHostWithPort =
      ntlmHostUrl.hostname + ":" + URLExt.portOrDefault(ntlmHostUrl);
    if (ntlmHostWithPort in this.ntlmHosts) {
      return this.ntlmHosts[ntlmHostWithPort];
    }
    // Then without port
    if (ntlmHostUrl.hostname in this.ntlmHosts) {
      return this.ntlmHosts[ntlmHostUrl.hostname];
    }
    // Wildcard match only without port
    return Object.values(this.ntlmHostWildcards).find((hostConfig) =>
      hostConfig.ntlmHostRegex.test(ntlmHostUrl.hostname)
    );
  }

  /**
   * Set NTLM SSO config from NTLM SSO config request. Replaces current config
   * @param ntlmSsoConfig NTLM SSO config
   */
  setSsoConfig(ntlmSsoConfig: NtlmSsoConfig) {
    const nonWildcards = ntlmSsoConfig.ntlmHosts.filter(
      (s) => s.indexOf("*") === -1
    );
    const wildcards = ntlmSsoConfig.ntlmHosts.filter(
      (s) => s.indexOf("*") !== -1
    );
    this.ntlmSsoHosts = nonWildcards;
    this.ntlmSsoHostWildcards = wildcards.map(
      (s) => new RegExp(`^${s.replace(/\*/g, ".*")}$`, "i")
    );
  }

  /**
   * Check if SSO should be used for target Url
   * @param ntlmHostUrl Target Url
   * @returns true if SSO should be used
   */
  useSso(ntlmHostUrl: URL): boolean {
    return this.existsSso(ntlmHostUrl) && this.exists(ntlmHostUrl) === false;
  }

  /**
   * Check if NTML config exists or SSO should be used for target Url
   * @param ntlmHostUrl Target Url
   * @returns true is NTLM config exists or SSO should be used
   */
  existsOrUseSso(ntlmHostUrl: URL): boolean {
    return this.exists(ntlmHostUrl) || this.existsSso(ntlmHostUrl);
  }

  private existsSso(ntlmHostUrl: URL): boolean {
    // Match with and without port
    if (
      this.ntlmSsoHosts.includes(ntlmHostUrl.host) ||
      this.ntlmSsoHosts.includes(ntlmHostUrl.hostname)
    ) {
      return true;
    }
    // Wildcard match only without port
    return (
      this.ntlmSsoHostWildcards.findIndex((re) =>
        re.test(ntlmHostUrl.hostname)
      ) !== -1
    );
  }

  /**
   * Clears all config
   */
  clear() {
    this.ntlmHosts = {};
    this.ntlmSsoHosts = [];
    this.ntlmSsoHostWildcards = [];
  }
}
