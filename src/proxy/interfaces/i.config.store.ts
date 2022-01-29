import { NtlmConfig } from "../../models/ntlm.config.model.js";
import { CompleteUrl } from "../../models/complete.url.model.js";
import { NtlmSsoConfig } from "../../models/ntlm.sso.config.model.js";
import { NtlmWildcardHost } from "../../models/ntlm.wildcard.host.model.js";
import { NtlmHost } from "../../models/ntlm.host.model.js";

export interface IConfigStore {
  updateConfig(config: NtlmConfig): void;
  exists(ntlmHostUrl: CompleteUrl): boolean;
  get(ntlmHostUrl: CompleteUrl): NtlmHost | NtlmWildcardHost | undefined;
  setSsoConfig(ntlmSsoConfig: NtlmSsoConfig): void;
  useSso(ntlmHostUrl: CompleteUrl): boolean;
  existsOrUseSso(ntlmHostUrl: CompleteUrl): boolean;
  clear(): void;
}
