import { NtlmConfig } from "../models/ntlm.config.model.js";
import { CompleteUrl } from "../models/complete.url.model.js";
import { injectable } from "inversify";
import { IConfigStore } from "./interfaces/i.config.store.js";
import { NtlmSsoConfig } from "../models/ntlm.sso.config.model.js";
import { NtlmHost } from "../models/ntlm.host.model.js";
import { NtlmWildcardHost } from "../models/ntlm.wildcard.host.model.js";

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
        ntlmHost: host,
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

  exists(ntlmHostUrl: CompleteUrl): boolean {
    const hostWithPort = ntlmHostUrl.hostname + ":" + ntlmHostUrl.port;
    if (hostWithPort in this.ntlmHosts) {
      return true;
    }
    if (ntlmHostUrl.hostname in this.ntlmHosts) {
      return true;
    }
    return (
      Object.values(this.ntlmHostWildcards).findIndex((hostConfig) =>
        hostConfig.ntlmHostRegex.test(ntlmHostUrl.hostname)
      ) !== -1
    );
  }

  get(ntlmHostUrl: CompleteUrl): NtlmHost | undefined {
    const hostWithPort = ntlmHostUrl.hostname + ":" + ntlmHostUrl.port;
    if (hostWithPort in this.ntlmHosts) {
      return this.ntlmHosts[hostWithPort];
    }
    if (ntlmHostUrl.hostname in this.ntlmHosts) {
      return this.ntlmHosts[ntlmHostUrl.hostname];
    }
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

  useSso(ntlmHostUrl: CompleteUrl): boolean {
    if (this.matchNtlmSsoHosts(ntlmHostUrl.hostname) && this.exists(ntlmHostUrl) === false) {
      return true;
    }
    return false;
  }

  existsOrUseSso(ntlmHostUrl: CompleteUrl): boolean {
    return this.exists(ntlmHostUrl) || this.matchNtlmSsoHosts(ntlmHostUrl.hostname);
  }

  private matchNtlmSsoHosts(hostname: string): boolean {
    if (this.ntlmSsoHosts.includes(hostname)) {
      return true;
    }
    return this.ntlmSsoHostWildcards.findIndex((re) => re.test(hostname)) !== -1;
  }

  clear() {
    this.ntlmHosts = {};
    this.ntlmSsoHosts = [];
    this.ntlmSsoHostWildcards = [];
  }
}
