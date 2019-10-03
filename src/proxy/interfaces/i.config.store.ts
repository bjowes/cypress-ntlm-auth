import { NtlmConfig } from '../../models/ntlm.config.model';
import { CompleteUrl } from '../../models/complete.url.model';
import { NtlmSsoConfig } from '../../models/ntlm.sso.config.model';

export interface IConfigStore {
  updateConfig(config: NtlmConfig): void;
  exists(ntlmHostUrl: CompleteUrl): boolean;
  get(ntlmHostUrl: CompleteUrl): NtlmConfig;
  setSsoConfig(ntlmSsoConfig: NtlmSsoConfig): void;
  useSso(ntlmHostUrl: CompleteUrl): boolean;
  existsOrUseSso(ntlmHostUrl: CompleteUrl): boolean;
  clear(): void;
}
