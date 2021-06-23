import { tls } from "node-forge";

export enum HttpsValidationLevel {
  Unsafe = 0,
  Warn = 1,
  Strict = 2
}

export class HttpsFacade {
  private validationLevel = HttpsValidationLevel.Warn;

  validatePeerCert(targetUrl: string) {
    if (this.validationLevel === HttpsValidationLevel.Unsafe) {
      return true;
    }
    try {
      tls.connect
    }
  }

  request() {

  }
}
