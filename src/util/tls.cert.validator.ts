import { injectable } from "inversify";
import tls from "tls";
import { CompleteUrl } from "../models/complete.url.model";
import { ITlsCertValidator } from "./interfaces/i.tls.cert.validator";

@injectable()
export class TlsCertValidator implements ITlsCertValidator {
  validate(targetHost: CompleteUrl): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let socket: tls.TLSSocket;
      socket = tls.connect({ host: targetHost.hostname, port: +targetHost.port, servername: targetHost.hostname }, () => {
        socket.end();
        return resolve();
      });
      socket.on('error', (err) => {
        socket.destroy();
        return reject(err);
      });
    });
  }
}

