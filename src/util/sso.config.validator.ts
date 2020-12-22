import os from "os";

import { NtlmSsoConfig } from "../models/ntlm.sso.config.model";
import { NtlmConfigValidateResult } from "../models/ntlm.config.validate.result";
import { osSupported } from "win-sso";
import { HostnameValidator } from "./hostname.validator";

export class SsoConfigValidator {
  static validate(config: NtlmSsoConfig): NtlmConfigValidateResult {
    const result = { ok: false } as NtlmConfigValidateResult;

    if (!osSupported() && (os.platform() as string) != "browser") {
      result.message =
        "SSO is not supported on this platform. Only Windows OSs are supported.";
      return result;
    }

    if (!config.ntlmHosts) {
      result.message =
        "Incomplete configuration. ntlmHosts is an required field.";
      return result;
    }

    if (!(config.ntlmHosts instanceof Array)) {
      result.message = "Invalid ntlmHosts, must be an array.";
      return result;
    }

    const allNtlmHostsPass = config.ntlmHosts.every((ntlmHost) => {
      if (!HostnameValidator.validHostnameOrFqdn(ntlmHost)) {
        result.message =
          "Invalid host [" +
          HostnameValidator.escapeHtml(ntlmHost) +
          "] in ntlmHosts, must be only a hostname or FQDN " +
          "(localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted.";
        return false;
      }
      return true;
    });
    if (!allNtlmHostsPass) {
      return result;
    }

    result.ok = true;
    return result;
  }
}
