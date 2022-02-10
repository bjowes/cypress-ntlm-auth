export class URLExt extends URL {
  get portOrDefault(): number {
    if (this.port) {
      return +this.port;
    }
    switch (this.protocol) {
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
    throw new Error("Cannot return default port for unknown protocol " + this.protocol);
  }
}
