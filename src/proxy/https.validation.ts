import { inject, injectable } from 'inversify';
import { CompleteUrl } from '../models/complete.url.model';
import { IEnvironment } from '../startup/interfaces/i.environment';
import { IDebugLogger } from '../util/interfaces/i.debug.logger';
import { ITlsCertValidator } from '../util/interfaces/i.tls.cert.validator';
import { TYPES } from './dependency.injection.types';
import { IHttpsValidation } from './interfaces/i.https.validation';

export enum HttpsValidationLevel {
  Unsafe = 0,
  Warn = 1,
  Strict = 2
}

@injectable()
export class HttpsValidation implements IHttpsValidation {
  private _debug: IDebugLogger;
  private _tlsCertValidator: ITlsCertValidator;

  private validationLevel: HttpsValidationLevel;
  private validated: string[] = [];

  constructor(
    @inject(TYPES.IEnvironment) environment: IEnvironment,
    @inject(TYPES.ITlsCertValidator) tlsCertValidator: ITlsCertValidator,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger
  ) {
    this.validationLevel = environment.httpsValidation;
    this._tlsCertValidator = tlsCertValidator;
    this._debug = debug;
  }

  useHttpsValidation(targetHost: CompleteUrl): boolean {
    if (this.validationLevel === HttpsValidationLevel.Strict) {
      return true;
    }
    if (this.validationLevel === HttpsValidationLevel.Warn && !targetHost.isLocalhost) {
      return true;
    }
    return false;
  }

  validateRequest(targetHost: CompleteUrl) {
    if (!this.isSSL(targetHost)) {
      return;
    }
    if (this.validationLevel === HttpsValidationLevel.Strict) {
      return; // the actual request will perform the validation
    }
    this.validatePeerCert(targetHost);
  }

  validateConnect(targetHost: CompleteUrl) {
    if (!this.isSSL(targetHost)) {
      return;
    }
    this.validatePeerCert(targetHost);
  }

  private isSSL(targetHost: CompleteUrl) {
    return targetHost.protocol === 'https:';
  }

  private validatePeerCert(targetHost: CompleteUrl) {
    if (this.validationLevel === HttpsValidationLevel.Unsafe) {
      return; // no validation
    }
    if (this.validationLevel === HttpsValidationLevel.Warn) {
      if (targetHost.isLocalhost) {
        // Don't validate localhost targets on level Warn
        return;
      }
      // Only validate once per target on level Warn
      if (this.validated.indexOf(targetHost.href) !== -1) {
        return;
      }
      this.validated.push(targetHost.href);
    }
    if (this.isIP(targetHost.hostname)) {
      this._debug.log('Target for HTTPS request is an IP address (' + targetHost.hostname +'). Will not validate the certificate. Use hostnames for validation support.');
      console.warn('cypress-ntlm-auth: Target for HTTPS request is an IP address (' + targetHost.hostname +'). Will not validate the certificate. Use hostnames for validation support.');
      return;
    }
    this._tlsCertValidator.validate(targetHost)
    .catch(err => {
      console.warn('cypress-ntlm-auth: Certificate validation failed for "' + targetHost.href + '". ' + err.code);
      this._debug.log('WARN: Certificate validation failed for "' + targetHost.href + '".', err);
    })
  }

  reset() {
    this.validated = [];
  }

  private isIP(hostname: string) {
    const rx = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;
    return rx.test(hostname);
  }
}
