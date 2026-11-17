import type { NtlmConfig } from "../../models/ntlm.config.model.ts";
import type { NtlmSsoConfig } from "../../models/ntlm.sso.config.model.ts";
import type { NtlmWildcardHost } from "../../models/ntlm.wildcard.host.model.ts";
import type { NtlmHost } from "../../models/ntlm.host.model.ts";

export interface IConfigStore {
  updateConfig(config: NtlmConfig): void;
  exists(ntlmHostUrl: URL): boolean;
  get(ntlmHostUrl: URL): NtlmHost | NtlmWildcardHost | undefined;
  setSsoConfig(ntlmSsoConfig: NtlmSsoConfig): void;
  useSso(ntlmHostUrl: URL): boolean;
  existsOrUseSso(ntlmHostUrl: URL): boolean;
  clear(): void;
}
