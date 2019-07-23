import url from 'url';

import { NtlmConfig } from '../models/ntlm.config.model';
import { NtlmConfigValidateResult } from '../models/ntlm.config.validate.result';

export class ConfigValidator {
  static validate(config: NtlmConfig): NtlmConfigValidateResult {
    let result = { ok: false } as NtlmConfigValidateResult;

    if (!config.ntlmHost ||
        !config.username ||
        !config.password ||
        !config.ntlmVersion) {
      result.message = 'Incomplete configuration. ntlmHost, username, password and ntlmVersion are required fields.';
      return result;
    }

    let urlTest = url.parse(config.ntlmHost);
    if (!urlTest.hostname || !urlTest.protocol || !urlTest.slashes) {
      result.message = 'Invalid ntlmHost, must be a valid URL (like https://www.google.com)';
      return result;
    }
    if (urlTest.path && urlTest.path !== '' && urlTest.path !== '/') {
      result.message = 'Invalid ntlmHost, must not contain any path or query (https://www.google.com is ok, https://www.google.com/search is not ok)';
      return result;
    }

    if (!this.validateUsername(config.username)) {
      result.message = 'Username contains invalid characters or is too long.';
      return result;
    }

    if (config.domain && !this.validateDomainOrWorkstation(config.domain)) {
      result.message = 'Domain contains invalid characters or is too long.';
      return result;
    }

    if (config.workstation &&
        !this.validateDomainOrWorkstation(config.workstation)) {
      result.message = 'Workstation contains invalid characters or is too long.';
      return result;
    }

    if (config.ntlmVersion !== 1 && config.ntlmVersion !== 2) {
      result.message = 'Invalid ntlmVersion. Must be 1 or 2.';
      return result;
    }

    result.ok = true;
    return result;
  }

  // https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-2000-server/bb726984(v=technet.10)
  // Max 104 chars, invalid chars: " / \ [ ] : ; | = , + * ? < >
  private static validateUsername(username: string): boolean {
    if (username.length > 104) {
      return false;
    }
    if (username.includes('"') || username.includes('/') || username.includes('\\') ||
        username.includes('[') || username.includes(']') || username.includes(':') ||
        username.includes(';') || username.includes('|') || username.includes('=') ||
        username.includes(',') || username.includes('+') || username.includes('*') ||
        username.includes('?') || username.includes('<') || username.includes('>')) {
      return false;
    }
    return true;
  }

  // https://support.microsoft.com/sv-se/help/909264/naming-conventions-in-active-directory-for-computers-domains-sites-and
  // Max 15 chars, invalid chars: " / \ : | * ? < >
  private static validateDomainOrWorkstation(domain: string): boolean {
    if (domain.length > 15) {
      return false;
    }
    if (domain.includes('"') || domain.includes('/') || domain.includes('\\') ||
        domain.includes(':') || domain.includes('|') || domain.includes('*') ||
        domain.includes('?') || domain.includes('<') || domain.includes('>')) {
      return false;
    }
    return true;
  }
}

