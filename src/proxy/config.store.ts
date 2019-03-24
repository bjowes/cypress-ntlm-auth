import { NtlmConfig } from '../models/ntlm.config.model';
import { toCompleteUrl } from '../util/url.converter';
import { CompleteUrl } from '../models/complete.url.model';
import { injectable } from 'inversify';

interface NtlmHostConfigHash {
  [ntlmHost: string]: NtlmConfig
};

@injectable()
export class ConfigStore {
  private ntlmHosts: NtlmHostConfigHash = {};

  updateConfig(config: NtlmConfig) {
    let ntlmHostUrl = toCompleteUrl(config.ntlmHost, false);
    let hostConfig: NtlmConfig = {
      ntlmHost: ntlmHostUrl.href,
      username: config.username,
      password: config.password,
      domain: config.domain || '',
      workstation: config.workstation || ''
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
};
