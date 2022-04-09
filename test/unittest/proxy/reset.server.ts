import * as net from "net";
import { URLExt } from "../../../src/util/url.ext";

export class ResetServer {
  private server?: net.Server;

  url() {
    if (this.server) {
      return URLExt.addressInfoToUrl(
        this.server.address() as net.AddressInfo,
        "http:"
      );
    }
    return null;
  }

  start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.server = net.createServer((clientSocket) => clientSocket.destroy());
      this.server.on("error", (err) => {
        reject(err);
      });
      this.server.listen(0, "localhost", () => resolve());
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = undefined;
    }
  }
}
