import type { NtlmHost } from "./ntlm.host.model.ts";

export interface NtlmWildcardHost extends NtlmHost {
  ntlmHostRegex: RegExp;
}
