export class URLExt {
  static portOrDefault(url: URL): number {
    if (url.port) {
      return +url.port;
    }
    switch (url.protocol) {
      case "http:":
        return 80;
      case "https:":
        return 443;
      case "ws":
        return 80;
      case "wss":
        return 443;
      case "ftp:":
        return 21;
    }
    throw new Error(
      "Cannot return default port for unknown protocol " + url.protocol
    );
  }

  /**
   * Removes IPv6 quotes from hostnames
   * @param url {URL} Url
   * @returns Hostname without IPv6 quotes
   */

  static unescapeHostname(url: URL) {
    return url.hostname.replace("[", "").replace("]", "");
  }
}
