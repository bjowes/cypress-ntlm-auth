import "reflect-metadata";
import "mocha";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";
import { IDebugLogger } from "../../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../../src/util/debug.logger";
import {
  HttpsValidation,
  HttpsValidationLevel,
} from "../../../src/proxy/https.validation";
import assert from "assert";
import { IEnvironment } from "../../../src/startup/interfaces/i.environment";
import { ITlsCertValidator } from "../../../src/util/interfaces/i.tls.cert.validator";
import { IConsoleLogger } from "../../../src/util/interfaces/i.console.logger";

describe("HTTPS Validation", function () {
  let environmentMock: SubstituteOf<IEnvironment>;
  let tlsCertValidatorMock: SubstituteOf<ITlsCertValidator>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();
  let consoleMock: SubstituteOf<IConsoleLogger>;

  let localhostUrl = new URL("https://localhost:8080");
  let externalUrl = new URL("https://external:443");
  let rawIpv4Url = new URL("https://10.20.30.40:8081");
  let rawIpv6Url = new URL(
    "https://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:8081"
  );
  let externalNonSslUrl = new URL("http://external:80");

  beforeEach(function () {
    environmentMock = Substitute.for<IEnvironment>();
    tlsCertValidatorMock = Substitute.for<ITlsCertValidator>();
    tlsCertValidatorMock.validate(Arg.all()).resolves();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    consoleMock = Substitute.for<IConsoleLogger>();
  });

  function getHttpsValidator() {
    return new HttpsValidation(
      environmentMock,
      tlsCertValidatorMock,
      debugMock,
      consoleMock
    );
  }

  describe("useRequestHttpsValidation", () => {
    it("should return true in strict mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Strict);
      let res = getHttpsValidator().useRequestHttpsValidation();
      assert.ok(res);
    });

    it("should return false in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      let res = getHttpsValidator().useRequestHttpsValidation();
      assert.ok(!res);
    });

    it("should return false in unsafe mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Unsafe);
      let res = getHttpsValidator().useRequestHttpsValidation();
      assert.ok(!res);
    });
  });

  describe("validateRequest", function () {
    it("should not validate localhost request in strict mode (validation done by the request itself)", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Strict);
      getHttpsValidator().validateRequest(localhostUrl);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
    });

    it("should not validate external request in strict mode (validation done by the request itself)", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Strict);
      getHttpsValidator().validateRequest(externalUrl);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
    });

    it("should not validate localhost request in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      getHttpsValidator().validateRequest(localhostUrl);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
    });

    it("should validate external request in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      getHttpsValidator().validateRequest(externalUrl);
      tlsCertValidatorMock.received(1).validate(externalUrl);
    });

    it("should write warn if external request validation fails", (done) => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      tlsCertValidatorMock = Substitute.for<ITlsCertValidator>();
      const error: NodeJS.ErrnoException = {
        message: "testmessage",
        name: "testname",
        code: "ERR_INVALID_CERT",
      };
      tlsCertValidatorMock.validate(Arg.any()).rejects(error);
      getHttpsValidator().validateRequest(externalUrl);
      tlsCertValidatorMock.received(1).validate(externalUrl);
      setTimeout(() => {
        // Make sure the promise rejection has been processed
        debugMock
          .received(1)
          .log('WARN: Certificate validation failed for "external".', error);
        consoleMock
          .received(1)
          .warn(
            'cypress-ntlm-auth: Certificate validation failed for "external". ERR_INVALID_CERT'
          );
        done();
      }, 1);
    });

    it("should not validate non-SSL external request in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      getHttpsValidator().validateRequest(externalNonSslUrl);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
    });

    it("should validate external request only once in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      let validator = getHttpsValidator();
      validator.validateRequest(externalUrl);
      tlsCertValidatorMock.received(1).validate(externalUrl);
      validator.validateRequest(externalUrl);
      tlsCertValidatorMock.received(1).validate(externalUrl);
    });

    it("should validate external request again after reset in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      let validator = getHttpsValidator();
      validator.validateRequest(externalUrl);
      tlsCertValidatorMock.received(1).validate(externalUrl);
      validator.reset();
      validator.validateRequest(externalUrl);
      tlsCertValidatorMock.received(2).validate(externalUrl);
    });

    it("should not validate request to raw IPv4 in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      getHttpsValidator().validateRequest(rawIpv4Url);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
      debugMock
        .received(1)
        .log(
          "Target for HTTPS request is an IP address (10.20.30.40). Will not validate the certificate. Use hostnames for validation support."
        );
      consoleMock
        .received(1)
        .warn(
          "cypress-ntlm-auth: Target for HTTPS request is an IP address (10.20.30.40). Will not validate the certificate. Use hostnames for validation support."
        );
    });

    it("should not validate request to raw IPv6 in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      getHttpsValidator().validateRequest(rawIpv6Url);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
      debugMock
        .received(1)
        .log(
          "Target for HTTPS request is an IP address ([2001:db8:85a3::8a2e:370:7334]). Will not validate the certificate. Use hostnames for validation support."
        );
      consoleMock
        .received(1)
        .warn(
          "cypress-ntlm-auth: Target for HTTPS request is an IP address ([2001:db8:85a3::8a2e:370:7334]). Will not validate the certificate. Use hostnames for validation support."
        );
    });

    it("should not validate localhost request in unsafe mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Unsafe);
      getHttpsValidator().validateRequest(localhostUrl);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
    });

    it("should not validate external request in unsafe mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Unsafe);
      getHttpsValidator().validateRequest(externalUrl);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
    });
  });

  describe("validateConnect", () => {
    it("should validate localhost connect in strict mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Strict);
      getHttpsValidator().validateConnect(localhostUrl);
      tlsCertValidatorMock.received(1).validate(localhostUrl);
    });

    it("should validate external connect in strict mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Strict);
      getHttpsValidator().validateConnect(externalUrl);
      tlsCertValidatorMock.received(1).validate(externalUrl);
    });

    it("should validate external connect every time in strict mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Strict);
      let validator = getHttpsValidator();
      validator.validateConnect(externalUrl);
      tlsCertValidatorMock.received(1).validate(externalUrl);
      validator.validateConnect(externalUrl);
      tlsCertValidatorMock.received(2).validate(externalUrl);
    });

    it("should not validate localhost connect in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      getHttpsValidator().validateConnect(localhostUrl);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
    });

    it("should validate external connect in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      getHttpsValidator().validateConnect(externalUrl);
      tlsCertValidatorMock.received(1).validate(externalUrl);
    });

    it("should write warn if external connect validation fails", (done) => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      tlsCertValidatorMock = Substitute.for<ITlsCertValidator>();
      const error: NodeJS.ErrnoException = {
        message: "testmessage",
        name: "testname",
        code: "ERR_INVALID_CERT",
      };
      tlsCertValidatorMock.validate(Arg.any()).rejects(error);
      getHttpsValidator().validateConnect(externalUrl);
      tlsCertValidatorMock.received(1).validate(externalUrl);
      setTimeout(() => {
        // Make sure the promise rejection has been processed
        debugMock
          .received(1)
          .log('WARN: Certificate validation failed for "external".', error);
        consoleMock
          .received(1)
          .warn(
            'cypress-ntlm-auth: Certificate validation failed for "external". ERR_INVALID_CERT'
          );
        done();
      }, 1);
    });

    it("should not validate non-SSL external request in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      getHttpsValidator().validateConnect(externalNonSslUrl);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
    });

    it("should validate external connect only once in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      let validator = getHttpsValidator();
      validator.validateConnect(externalUrl);
      tlsCertValidatorMock.received(1).validate(externalUrl);
      validator.validateConnect(externalUrl);
      tlsCertValidatorMock.received(1).validate(externalUrl);
    });

    it("should validate connect request again after reset in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      let validator = getHttpsValidator();
      validator.validateConnect(externalUrl);
      tlsCertValidatorMock.received(1).validate(externalUrl);
      validator.reset();
      validator.validateConnect(externalUrl);
      tlsCertValidatorMock.received(2).validate(externalUrl);
    });

    it("should not validate connect to raw IPv4 in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      getHttpsValidator().validateConnect(rawIpv4Url);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
      debugMock
        .received(1)
        .log(
          "Target for HTTPS request is an IP address (10.20.30.40). Will not validate the certificate. Use hostnames for validation support."
        );
      consoleMock
        .received(1)
        .warn(
          "cypress-ntlm-auth: Target for HTTPS request is an IP address (10.20.30.40). Will not validate the certificate. Use hostnames for validation support."
        );
    });

    it("should not validate connect to raw IPv6 in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      getHttpsValidator().validateConnect(rawIpv6Url);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
      debugMock
        .received(1)
        .log(
          "Target for HTTPS request is an IP address ([2001:db8:85a3::8a2e:370:7334]). Will not validate the certificate. Use hostnames for validation support."
        );
      consoleMock
        .received(1)
        .warn(
          "cypress-ntlm-auth: Target for HTTPS request is an IP address ([2001:db8:85a3::8a2e:370:7334]). Will not validate the certificate. Use hostnames for validation support."
        );
    });

    it("should not validate localhost connect in unsafe mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Unsafe);
      getHttpsValidator().validateConnect(localhostUrl);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
    });

    it("should not validate external connect in unsafe mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Unsafe);
      getHttpsValidator().validateConnect(externalUrl);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
    });
  });
});
