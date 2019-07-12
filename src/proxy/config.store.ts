import { NtlmConfig } from '../models/ntlm.config.model';
import { toCompleteUrl } from '../util/url.converter';
import { CompleteUrl } from '../models/complete.url.model';
import { injectable } from 'inversify';
import { IConfigStore } from './interfaces/i.config.store';

interface NtlmHostConfigHash {
  [ntlmHost: string]: NtlmConfig;
}

@injectable()
export class ConfigStore implements IConfigStore {
  private ntlmHosts: NtlmHostConfigHash = {};

  updateConfig(config: NtlmConfig) {
    let ntlmHostUrl = toCompleteUrl(config.ntlmHost, false);
    let hostConfig: NtlmConfig = {
      ntlmHost: ntlmHostUrl.href,
      username: config.username,
      password: config.password,
      domain: config.domain ? config.domain.toUpperCase() : undefined,
      workstation: config.workstation ? config.workstation.toUpperCase() : undefined
    };

    this.ntlmHosts[ntlmHostUrl.href] = hostConfig;
  }

  exists(ntlmHostUrl: CompleteUrl): boolean {
    return ntlmHostUrl.href in this.ntlmHosts;
  }

  get(ntlmHostUrl: CompleteUrl): NtlmConfig {
    return this.ntlmHosts[ntlmHostUrl.href];
  }

  clear() {
    this.ntlmHosts = {};
  }
}
