import { NtlmConfig } from '../../models/ntlm.config.model';
import { CompleteUrl } from '../../models/complete.url.model';

export interface IConfigStore {
  updateConfig(config: NtlmConfig): void;
  exists(ntlmHostUrl: CompleteUrl): boolean;
  get(ntlmHostUrl: CompleteUrl): NtlmConfig;
  clear(): void;
}
