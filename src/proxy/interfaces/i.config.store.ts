import { NtlmConfig } from "../../models/ntlm.config.model";
import { NtlmSsoConfig } from "../../models/ntlm.sso.config.model";
import { NtlmWildcardHost } from "../../models/ntlm.wildcard.host.model";
import { NtlmHost } from "../../models/ntlm.host.model";

export interface IConfigStore {
  updateConfig(config: NtlmConfig): void;
  exists(ntlmHostUrl: URL): boolean;
  get(ntlmHostUrl: URL): NtlmHost | NtlmWildcardHost | undefined;
  setSsoConfig(ntlmSsoConfig: NtlmSsoConfig): void;
  useSso(ntlmHostUrl: URL): boolean;
  existsOrUseSso(ntlmHostUrl: URL): boolean;
  clear(): void;
}
