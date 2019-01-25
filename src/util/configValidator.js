
const url = require('url');

module.exports = {
  validate: function(config) {
    if (!config.ntlmHost ||
      !config.username ||
      !config.password) {
      return { ok: false, message: 'Incomplete configuration. ntlmHost, username and password are required fields.' };
    }

    let urlTest = url.parse(config.ntlmHost);
    if (!urlTest.hostname || !urlTest.protocol || !urlTest.slashes) {
      return { ok: false, message: 'Invalid ntlmHost, must be a valid URL (like https://www.google.com)' };
    }
    if (urlTest.path && urlTest.path !== '' && urlTest.path !== '/') {
      return { ok: false, message: 'Invalid ntlmHost, must not contain any path or query (https://www.google.com is ok, https://www.google.com/search is not ok)' };
    }

    if (!validateUsername(config.username)) {
      return { ok: false, message: 'Username contains invalid characters or is too long.' };
    }

    if (config.domain && !validateDomainOrWorkstation(config.domain)) {
      return { ok: false, message: 'Domain contains invalid characters or is too long.' };
    }

    if (config.workstation &&
      !validateDomainOrWorkstation(config.workstation)) {
      return { ok: false, message: 'Workstation contains invalid characters or is too long.' };
    }

    return { ok: true };
  }
};

// https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-2000-server/bb726984(v=technet.10)
// Max 104 chars, invalid chars: " / \ [ ] : ; | = , + * ? < >
function validateUsername(username) {
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
function validateDomainOrWorkstation(domain) {
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
