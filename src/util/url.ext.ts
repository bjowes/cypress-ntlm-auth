import { AddressInfo } from "net";

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
   * @param url Url
   * @returns Hostname without IPv6 quotes
   */
  static unescapeHostname(url: URL) {
    return url.hostname.replace("[", "").replace("]", "");
  }

  /**
   * Converts an AddressInfo object (from a listen callback) to an URL
   * @param addressInfo AddressInfo
   * @param protocol Communication protocol, such as http:
   * @returns URL
   */
  static addressInfoToUrl(addressInfo: AddressInfo, protocol: string): URL {
    if (
      (addressInfo.family as unknown as number) === 6 || // Node 18 uses numeric family value
      addressInfo.family === "IPv6"
    ) {
      return new URL(
        `${protocol}//[${addressInfo.address}]:${addressInfo.port}`
      );
    }
    return new URL(`${protocol}//${addressInfo.address}:${addressInfo.port}`);
  }
}
