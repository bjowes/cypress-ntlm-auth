import { injectable } from "inversify";
import tls from "tls";
import { ITlsCertValidator } from "./interfaces/i.tls.cert.validator";
import { URLExt } from "./url.ext";

@injectable()
export class TlsCertValidator implements ITlsCertValidator {
  validate(targetHost: URL): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const socket = tls.connect(
        {
          host: URLExt.unescapeHostname(targetHost),
          port: URLExt.portOrDefault(targetHost),
          servername: targetHost.hostname,
        },
        () => {
          socket.end();
          return resolve();
        }
      );
      socket.on("error", (err) => {
        socket.destroy();
        return reject(err);
      });
    });
  }
}
