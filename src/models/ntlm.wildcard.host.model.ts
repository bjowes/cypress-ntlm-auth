import { NtlmHost } from "./ntlm.host.model.js";

export interface NtlmWildcardHost extends NtlmHost {
  ntlmHostRegex: RegExp;
}
