import { NtlmConfig } from "../models/ntlm.config.model.js";
import { injectable } from "inversify";
import { IConfigStore } from "./interfaces/i.config.store.js";
import { NtlmSsoConfig } from "../models/ntlm.sso.config.model.js";
import { NtlmHost } from "../models/ntlm.host.model.js";
import { NtlmWildcardHost } from "../models/ntlm.wildcard.host.model.js";
import { URLExt } from "../util/url.ext.js";

interface NtlmHostConfigHash {
  [ntlmHost: string]: NtlmHost;
}

interface NtlmWildcardHostConfigHash {
  [ntlmHost: string]: NtlmWildcardHost;
}

@injectable()
export class ConfigStore implements IConfigStore {
  private ntlmHosts: NtlmHostConfigHash = {};
  private ntlmHostWildcards: NtlmWildcardHostConfigHash = {};
  private ntlmSsoHosts: string[] = [];
  private ntlmSsoHostWildcards: RegExp[] = [];

  updateConfig(config: NtlmConfig) {
    const nonWildcards = config.ntlmHosts.filter((s) => s.indexOf("*") === -1);
    const wildcards = config.ntlmHosts.filter((s) => s.indexOf("*") !== -1);
    nonWildcards.forEach((host) => {
      const hostConfig: NtlmHost = {
        ntlmHost: new URLExt(`http://${host}`).host, // Trims away default ports
        username: config.username,
        password: config.password,
        domain: config.domain ? config.domain.toUpperCase() : undefined,
        workstation: config.workstation ? config.workstation.toUpperCase() : undefined,
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
        workstation: config.workstation ? config.workstation.toUpperCase() : undefined,
        ntlmVersion: config.ntlmVersion,
      };
      this.ntlmHostWildcards[wildcard] = hostConfig;
    });
  }

  exists(ntlmHostUrl: URLExt): boolean {
    // Match with and without port
    if (ntlmHostUrl.host in this.ntlmHosts) {
      return true;
    }
    if (ntlmHostUrl.hostname in this.ntlmHosts) {
      return true;
    }
    // Wildcard match only without port
    return (
      Object.values(this.ntlmHostWildcards).findIndex((hostConfig) =>
        hostConfig.ntlmHostRegex.test(ntlmHostUrl.host)
      ) !== -1
    );
  }

  get(ntlmHostUrl: URLExt): NtlmHost | undefined {
    // Match first with port
    if (ntlmHostUrl.host in this.ntlmHosts) {
      return this.ntlmHosts[ntlmHostUrl.host];
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

  setSsoConfig(ntlmSsoConfig: NtlmSsoConfig) {
    const nonWildcards = ntlmSsoConfig.ntlmHosts.filter((s) => s.indexOf("*") === -1);
    const wildcards = ntlmSsoConfig.ntlmHosts.filter((s) => s.indexOf("*") !== -1);
    this.ntlmSsoHosts = nonWildcards;
    this.ntlmSsoHostWildcards = wildcards.map((s) => new RegExp(`^${s.replace(/\*/g, ".*")}$`, "i"));
  }

  useSso(ntlmHostUrl: URLExt): boolean {
    return this.existsSso(ntlmHostUrl) && this.exists(ntlmHostUrl) === false;
  }

  existsOrUseSso(ntlmHostUrl: URLExt): boolean {
    return this.exists(ntlmHostUrl) || this.existsSso(ntlmHostUrl);
  }

  private existsSso(ntlmHostUrl: URLExt): boolean {
    // Match with and without port
    if (this.ntlmSsoHosts.includes(ntlmHostUrl.host) || this.ntlmSsoHosts.includes(ntlmHostUrl.hostname)) {
      return true;
    }
    // Wildcard match only without port
    return this.ntlmSsoHostWildcards.findIndex((re) => re.test(ntlmHostUrl.hostname)) !== -1;
  }

  clear() {
    this.ntlmHosts = {};
    this.ntlmSsoHosts = [];
    this.ntlmSsoHostWildcards = [];
  }
}
