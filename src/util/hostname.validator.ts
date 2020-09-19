export class HostnameValidator {
  public static validHostnameOrFqdn(host: string): boolean {
    if (host.indexOf("\n") !== -1) {
      return false;
    }
    // Replace all wildcards with a character to pass hostname/FQDN test
    const hostNoWildcard = host.replace(/\*/g, "a");
    const validatorRegex = new RegExp(
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/
    );
    return validatorRegex.test(hostNoWildcard);
  }

  public static validHostnameOrFqdnWithPort(host: string): boolean {
    if (host.indexOf("\n") !== -1) {
      return false;
    }
    const validatorRegex = new RegExp(
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9]):\d{1,5}$/
    );
    return validatorRegex.test(host);
  }

  public static escapeHtml(unsafe: string) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
