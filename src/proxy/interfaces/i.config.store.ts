import type { NtlmConfig } from "../../models/ntlm.config.model.ts";
import type { NtlmSsoConfig } from "../../models/ntlm.sso.config.model.ts";
import type { NtlmWildcardHost } from "../../models/ntlm.wildcard.host.model.ts";
import type { NtlmHost } from "../../models/ntlm.host.model.ts";

export abstract class IConfigStore {
  abstract updateConfig(config: NtlmConfig): void;
  abstract exists(ntlmHostUrl: URL): boolean;
  abstract get(ntlmHostUrl: URL): NtlmHost | NtlmWildcardHost | undefined;
  abstract setSsoConfig(ntlmSsoConfig: NtlmSsoConfig): void;
  abstract useSso(ntlmHostUrl: URL): boolean;
  abstract existsOrUseSso(ntlmHostUrl: URL): boolean;
  abstract clear(): void;
}
