// cSpell:ignore nisse, manpwr, mptest, testpc

import assert from "assert";

import { SsoConfigValidator } from "../../../src/util/sso.config.validator";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";

describe("SsoConfigValidator", function () {
  describe("ntlmHosts", function () {
    let config: NtlmSsoConfig;

    beforeEach(function () {
      config = {
        ntlmHosts: [
          "*.acme.org",
          "www.google.com",
          "localhost",
          "127.0.0.1",
          "[::]",
          "[2001:0db8:85a3:0000:0000:8a2e:0370:7334]",
        ],
      };
    });

    it("Valid hostname in ntlmHosts succeeds", function () {
      // Act
      const result = SsoConfigValidator.validate(config);

      // Assert
      assert.equal(result.ok, true);
    });

    it("Valid FQDN in ntlmHosts succeeds", function () {
      // Arrange
      config.ntlmHosts = ["www.google.com"];

      // Act
      const result = SsoConfigValidator.validate(config);

      // Assert
      assert.equal(result.ok, true);
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
      const result = SsoConfigValidator.validate(config);

      // Assert
      assert.equal(result.ok, true);
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
      const result = SsoConfigValidator.validate(config);

      // Assert
      assert.equal(result.ok, true);
    });

    it("Does return error if ntlmHost contains path", function () {
      // Arrange
      config.ntlmHosts = ["http://localhost:5000/search"];

      // Act
      const result = SsoConfigValidator.validate(config);

      // Assert
      assert.equal(result.ok, false);
      assert.equal(
        result.message,
        "Invalid host [http://localhost:5000/search] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
      );
    });

    it("Does return error if ntlmHosts contains protocol", function () {
      // Arrange
      config.ntlmHosts = ["http://localhost"];

      // Act
      const result = SsoConfigValidator.validate(config);

      // Assert
      assert.equal(result.ok, false);
      assert.equal(
        result.message,
        "Invalid host [http://localhost] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
      );
    });

    it("Does return error if ntlmHosts contains port", function () {
      // Arrange
      config.ntlmHosts = ["localhost:80"];

      // Act
      const result = SsoConfigValidator.validate(config);

      // Assert
      assert.equal(result.ok, false);
      assert.equal(
        result.message,
        "Invalid host [localhost:80] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
      );
    });

    it("Does return error if ntlmHosts contains valid and invalid hosts", function () {
      // Arrange
      config.ntlmHosts = ["nisse", "localhost:80"];

      // Act
      const result = SsoConfigValidator.validate(config);

      // Assert
      assert.equal(result.ok, false);
      assert.equal(
        result.message,
        "Invalid host [localhost:80] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
      );
    });

    it("Does return error if ntlmHosts isn't and array", function () {
      // Arrange
      const dummyConfig: any = {
        ntlmHosts: "localhost",
      };

      // Act
      const result = SsoConfigValidator.validate(dummyConfig);

      // Assert
      assert.equal(result.ok, false);
      assert.equal(result.message, "Invalid ntlmHosts, must be an array.");
    });
  });
});
