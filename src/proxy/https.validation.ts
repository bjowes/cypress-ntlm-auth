import { inject, injectable } from "inversify";
import { HttpsValidationLevel } from "../models/https.validation.level.enum";
import { IEnvironment } from "../startup/interfaces/i.environment";
import { IConsoleLogger } from "../util/interfaces/i.console.logger";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { ITlsCertValidator } from "../util/interfaces/i.tls.cert.validator";
import { TYPES } from "./dependency.injection.types";
import { IHttpsValidation } from "./interfaces/i.https.validation";

/**
 * HTTP Validator
 */
@injectable()
export class HttpsValidation implements IHttpsValidation {
  private _debug: IDebugLogger;
  private _tlsCertValidator: ITlsCertValidator;
  private _console: IConsoleLogger;

  private validationLevel: HttpsValidationLevel;
  private validated: string[] = [];

  /**
   * Constructor
   * @param environment Environment variable accessor
   * @param tlsCertValidator TLS Certificate validator
   * @param debug Debug logger
   * @param consoleLogger Console logger
   */
  constructor(
    @inject(TYPES.IEnvironment) environment: IEnvironment,
    @inject(TYPES.ITlsCertValidator) tlsCertValidator: ITlsCertValidator,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger,
    @inject(TYPES.IConsoleLogger) consoleLogger: IConsoleLogger
  ) {
    this.validationLevel = environment.httpsValidation;
    this._tlsCertValidator = tlsCertValidator;
    this._debug = debug;
    this._console = consoleLogger;
  }

  /**
   * Should HTTPS validation be used on all requests
   * @returns true if HTTPS validation should be used on all requests
   */
  useRequestHttpsValidation(): boolean {
    return this.validationLevel === HttpsValidationLevel.Strict;
  }

  /**
   * Performs HTTPS validation on a request
   * @param targetHost Target Url
   */
  validateRequest(targetHost: URL): void {
    if (!this.isSSL(targetHost)) {
      return;
    }
    if (this.validationLevel === HttpsValidationLevel.Strict) {
      return; // the actual request will perform the validation
    }
    this.validatePeerCert(targetHost);
  }

  /**
   * Performs HTTPS validation on a connect
   * @param targetHost Target Url
   */
  validateConnect(targetHost: URL): void {
    if (!this.isSSL(targetHost)) {
      return;
    }
    this.validatePeerCert(targetHost);
  }

  private isSSL(targetHost: URL) {
    return targetHost.protocol === "https:";
  }

  private validatePeerCert(targetHost: URL) {
    if (this.validationLevel === HttpsValidationLevel.Unsafe) {
      return; // no validation
    }
    if (this.validationLevel === HttpsValidationLevel.Warn) {
      if (
        targetHost.hostname === "localhost" ||
        targetHost.hostname === "127.0.0.1" ||
        targetHost.hostname === "[::1]"
      ) {
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
      this._debug.log(
        "Target for HTTPS request is an IP address (" +
          targetHost.hostname +
          "). Will not validate the certificate. Use hostnames for validation support."
      );
      this._console.warn(
        "cypress-ntlm-auth: Target for HTTPS request is an IP address (" +
          targetHost.hostname +
          "). Will not validate the certificate. Use hostnames for validation support."
      );
      return;
    }
    this._tlsCertValidator.validate(targetHost).catch((err) => {
      this._console.warn(
        'cypress-ntlm-auth: Certificate validation failed for "' +
          targetHost.host +
          '". ' +
          err.code
      );
      this._debug.log(
        'WARN: Certificate validation failed for "' + targetHost.host + '".',
        err
      );
    });
  }

  /**
   * Reset cache of validated hosts
   */
  reset() {
    this.validated = [];
  }

  private isIP(hostname: string) {
    const ipv4ValidatorRegex =
      /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;
    const ipv6ValidatorRegex = new RegExp(
      /^\[(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\]$/
    );

    return (
      ipv4ValidatorRegex.test(hostname) || ipv6ValidatorRegex.test(hostname)
    );
  }
}
