import { NtlmConfig } from "../../models/ntlm.config.model.js";
import { NtlmSsoConfig } from "../../models/ntlm.sso.config.model.js";
import { NtlmWildcardHost } from "../../models/ntlm.wildcard.host.model.js";
import { NtlmHost } from "../../models/ntlm.host.model.js";
import { URLExt } from "../../util/url.ext.js";

export interface IConfigStore {
  updateConfig(config: NtlmConfig): void;
  exists(ntlmHostUrl: URLExt): boolean;
  get(ntlmHostUrl: URLExt): NtlmHost | NtlmWildcardHost | undefined;
  setSsoConfig(ntlmSsoConfig: NtlmSsoConfig): void;
  useSso(ntlmHostUrl: URLExt): boolean;
  existsOrUseSso(ntlmHostUrl: URLExt): boolean;
  clear(): void;
}
