import "reflect-metadata";
import "mocha";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";
import sinon from "sinon";

import { expect } from "chai";
import { IDebugLogger } from "../../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../../src/util/debug.logger";
import { HttpsValidation, HttpsValidationLevel } from "../../../src/proxy/https.validation";
import { IEnvironment } from "../../../src/startup/interfaces/i.environment";
import { CompleteUrl } from "../../../src/models/complete.url.model";
import { ITlsCertValidator } from "../../../src/util/interfaces/i.tls.cert.validator";

describe("HTTPS Validation", function() {
  let environmentMock: SubstituteOf<IEnvironment>;
  let tlsCertValidatorMock: SubstituteOf<ITlsCertValidator>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();
  let consoleWarnStub: sinon.SinonStub;

  let localhostUrl = { hostname: 'localhost', port: '8080', isLocalhost: true, protocol: 'https:' } as CompleteUrl;
  let externalUrl = { hostname: 'external', port: '443', href: 'external:443', isLocalhost: false, protocol: 'https:' } as CompleteUrl;
  let rawIpUrl = { hostname: '10.20.30.40', port: '8081', isLocalhost: false, protocol: 'https:' } as CompleteUrl;
  let externalNonSslUrl = { hostname: 'external', port: '80', isLocalhost: false, protocol: 'http:' } as CompleteUrl;

  beforeEach(function () {
    environmentMock = Substitute.for<IEnvironment>();
    tlsCertValidatorMock = Substitute.for<ITlsCertValidator>();
    tlsCertValidatorMock.validate(Arg.all()).resolves();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
  });

  afterEach(function() {
    if (consoleWarnStub) {
      consoleWarnStub.restore();
    }
  })

  function getHttpsValidator() {
    return new HttpsValidation(environmentMock, tlsCertValidatorMock, debugMock);
  }

  describe("useHttpsValidation", () => {

    it("should return true for localhost in strict mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Strict);
      let res = getHttpsValidator().useHttpsValidation(localhostUrl);
      expect(res).to.be.true;
    });

    it("should return true for external in strict mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Strict);
      let res = getHttpsValidator().useHttpsValidation(externalUrl);
      expect(res).to.be.true;
    });

    it("should return false for localhost in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      let res = getHttpsValidator().useHttpsValidation(localhostUrl);
      expect(res).to.be.false;
    });

    it("should return true for external in warn mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      let res = getHttpsValidator().useHttpsValidation(externalUrl);
      expect(res).to.be.true;
    });

    it("should return false for localhost in unsafe mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Unsafe);
      let res = getHttpsValidator().useHttpsValidation(localhostUrl);
      expect(res).to.be.false;
    });

    it("should return false for external in unsafe mode", () => {
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Unsafe);
      let res = getHttpsValidator().useHttpsValidation(externalUrl);
      expect(res).to.be.false;
    });
  });

  describe("validateRequest", function() {
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
      consoleWarnStub = sinon.stub(console, "warn"); // Don't show the console.warn output
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
      setTimeout(() => { // Make sure the promise rejection has been processed
        debugMock.received(1).log('WARN: Certificate validation failed for "external:443".', error);
        expect(consoleWarnStub.called).to.be.true;
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

    it("should not validate request to raw IP in warn mode", () => {
      consoleWarnStub = sinon.stub(console, "warn"); // Don't show the console.warn output
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      getHttpsValidator().validateRequest(rawIpUrl);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
      debugMock.received(1).log('Target for HTTPS request is an IP address (10.20.30.40). Will not validate the certificate. Use hostnames for validation support.')
      expect(consoleWarnStub.called).to.be.true;
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
      consoleWarnStub = sinon.stub(console, "warn"); // Don't show the console.warn output
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
      setTimeout(() => { // Make sure the promise rejection has been processed
        debugMock.received(1).log('WARN: Certificate validation failed for "external:443".', error);
        expect(consoleWarnStub.called).to.be.true;
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

    it("should not validate connect to raw IP in warn mode", () => {
      consoleWarnStub = sinon.stub(console, "warn"); // Don't show the console.warn output
      environmentMock.httpsValidation.returns(HttpsValidationLevel.Warn);
      getHttpsValidator().validateConnect(rawIpUrl);
      tlsCertValidatorMock.didNotReceive().validate(Arg.any());
      debugMock.received(1).log('Target for HTTPS request is an IP address (10.20.30.40). Will not validate the certificate. Use hostnames for validation support.')
      expect(consoleWarnStub.called).to.be.true;
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
