import { injectable } from "inversify";
import tls from "tls";
import type { ITlsCertValidator } from "./interfaces/i.tls.cert.validator.ts";
import { URLExt } from "./url.ext.ts";

/**
 * Validation of TLS certificates
 */
@injectable()
export class TlsCertValidator implements ITlsCertValidator {
  /**
   * Resolves if the cert at supplied URL is valid
   * @param targetHost Url
   * @returns Resolves if valid
   */
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
