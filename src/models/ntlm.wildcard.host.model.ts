import { NtlmHost } from "./ntlm.host.model";

export interface NtlmWildcardHost extends NtlmHost {
  ntlmHostRegex: RegExp;
}
