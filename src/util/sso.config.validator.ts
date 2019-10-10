import url from 'url';

import { NtlmSsoConfig } from '../models/ntlm.sso.config.model';
import { NtlmConfigValidateResult } from '../models/ntlm.config.validate.result';
import { osSupported } from 'win-sso';

export class SsoConfigValidator {
  static validate(config: NtlmSsoConfig): NtlmConfigValidateResult {
    let result = { ok: false } as NtlmConfigValidateResult;

    if (!osSupported()) {
      result.message = 'SSO is not supported on this platform. Only Windows OSs are supported.';
      return result;
    }

    if (!config.ntlmHosts) {
      result.message = 'Incomplete configuration. ntlmHosts is an required field.';
      return result;
    }

    if (!(config.ntlmHosts instanceof Array)) {
      result.message = 'Invalid ntlmHosts, must be an array.';
      return result;
    }

    let allValid = true;
    config.ntlmHosts.forEach((ntlmHost) => {
      if (!this.validHostnameOrFqdn(ntlmHost)) {
        result.message = 'Invalid host [' + ntlmHost + '] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok)';
        allValid = false;
        return result;
      }
    });

    result.ok = allValid;
    return result;
  }

  static validHostnameOrFqdn(host: string): boolean {
    if (host.indexOf('\n') !== -1) {
      return false;
    }
    const validatorRegex = new RegExp(/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/);
    return validatorRegex.test(host);
  }
}

