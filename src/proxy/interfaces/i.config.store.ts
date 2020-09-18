import { NtlmConfig } from "../../models/ntlm.config.model";
import { CompleteUrl } from "../../models/complete.url.model";
import { NtlmSsoConfig } from "../../models/ntlm.sso.config.model";
import { NtlmWildcardHost } from "../../models/ntlm.wildcard.host.model";
import { NtlmHost } from "../../models/ntlm.host.model";

export interface IConfigStore {
  updateConfig(config: NtlmConfig): void;
  exists(ntlmHostUrl: CompleteUrl): boolean;
  get(ntlmHostUrl: CompleteUrl): NtlmHost | NtlmWildcardHost | undefined;
  setSsoConfig(ntlmSsoConfig: NtlmSsoConfig): void;
  useSso(ntlmHostUrl: CompleteUrl): boolean;
  existsOrUseSso(ntlmHostUrl: CompleteUrl): boolean;
  clear(): void;
}
