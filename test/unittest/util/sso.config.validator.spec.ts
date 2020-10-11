// cSpell:ignore nisse, manpwr, mptest, testpc

import chai from "chai";
import { SsoConfigValidator } from "../../../src/util/sso.config.validator";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";
import { osSupported } from "win-sso";

describe("SsoConfigValidator", function () {
  describe("ntlmHosts", function () {
    let config: NtlmSsoConfig;

    before("Check SSO support", function () {
      if (osSupported() === false) {
        this.skip();
        return;
      }
    });

    beforeEach(function () {
      config = {
        ntlmHosts: ["localhost"],
      };
    });

    it("Valid hostname in ntlmHosts succeeds", function () {
      // Act
      let result = SsoConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.true;
    });

    it("Valid FQDN in ntlmHosts succeeds", function () {
      // Arrange
      config.ntlmHosts = ["www.google.com"];

      // Act
      let result = SsoConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.true;
    });

    it("Mix of valid hostnames and FQDNs in ntlmHosts succeeds", function () {
      // Arrange
      config.ntlmHosts = [
        "localhost",
        "nisse",
        "bavaria",
        "www.google.com",
        "dn.se",
      ];

      // Act
      let result = SsoConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.true;
    });

    it("Mix of valid hostnames, FQDNs and wildcard FQDNs in ntlmHosts succeeds", function () {
      // Arrange
      config.ntlmHosts = [
        "localhost",
        "nisse",
        "bavaria",
        "github.com",
        "*.google.com",
        "*.dn.*.se",
      ];

      // Act
      let result = SsoConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.true;
    });

    it("Does return error if ntlmHost contains path", function () {
      // Arrange
      config.ntlmHosts = ["http://localhost:5000/search"];

      // Act
      let result = SsoConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai
        .expect(result.message)
        .to.be.equal(
          "Invalid host [http://localhost:5000/search] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
        );
    });

    it("Does return error if ntlmHosts contains protocol", function () {
      // Arrange
      config.ntlmHosts = ["http://localhost"];

      // Act
      let result = SsoConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai
        .expect(result.message)
        .to.be.equal(
          "Invalid host [http://localhost] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
        );
    });

    it("Does return error if ntlmHosts contains port", function () {
      // Arrange
      config.ntlmHosts = ["localhost:80"];

      // Act
      let result = SsoConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai
        .expect(result.message)
        .to.be.equal(
          "Invalid host [localhost:80] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
        );
    });

    it("Does return error if ntlmHosts contains valid and invalid hosts", function () {
      // Arrange
      config.ntlmHosts = ["nisse", "localhost:80"];

      // Act
      let result = SsoConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai
        .expect(result.message)
        .to.be.equal(
          "Invalid host [localhost:80] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
        );
    });

    it("Does return error if ntlmHosts isn't and array", function () {
      // Arrange
      let dummyConfig: any = {
        ntlmHosts: "localhost",
      };

      // Act
      let result = SsoConfigValidator.validate(dummyConfig);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai
        .expect(result.message)
        .to.be.equal("Invalid ntlmHosts, must be an array.");
    });
  });
});
