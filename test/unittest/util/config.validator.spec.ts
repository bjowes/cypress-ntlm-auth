// cSpell:ignore nisse, manpwr, mptest, testpc

import chai from "chai";
import { ConfigValidator } from "../../../src/util/config.validator";
import { NtlmConfig } from "../../../src/models/ntlm.config.model";

describe("ConfigValidator", function () {
  describe("validate", function () {
    describe("ntlmHost", function () {
      let config: NtlmConfig;

      beforeEach(function () {
        config = {
          ntlmHosts: ["*.acme.org", "www.google.com", "localhost:5000"],
          username: "nisse",
          password: "manpwr",
          ntlmVersion: 2,
        };
      });

      it("Valid ntlmHost succeeds", function () {
        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.true;
      });

      it("Does return error if ntlmHost contains path", function () {
        // Arrange
        config.ntlmHosts = ["localhost:5000/search"];

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal(
            "Invalid host [localhost:5000/search] in ntlmHosts, must be one of: 1) a hostname or FQDN, wildcards accepted. 2) hostname or FQDN with port, wildcards not accepted (localhost:8080 or www.google.com or *.acme.com are ok, https://www.google.com:443/search is not ok)."
          );
      });

      it("Does return error if ntlmHost contains protocol", function () {
        // Arrange
        config.ntlmHosts = ["http://localhost:5000"];

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal(
            "Invalid host [http://localhost:5000] in ntlmHosts, must be one of: 1) a hostname or FQDN, wildcards accepted. 2) hostname or FQDN with port, wildcards not accepted (localhost:8080 or www.google.com or *.acme.com are ok, https://www.google.com:443/search is not ok)."
          );
      });

      it("Does return error if ntlmHosts has both port and wildcard", function () {
        // Arrange
        config.ntlmHosts = ["*.acme.org:5000"];

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal(
            "Invalid host [*.acme.org:5000] in ntlmHosts, must be one of: 1) a hostname or FQDN, wildcards accepted. 2) hostname or FQDN with port, wildcards not accepted (localhost:8080 or www.google.com or *.acme.com are ok, https://www.google.com:443/search is not ok)."
          );
      });
    });

    describe("username", function () {
      let config: NtlmConfig;

      beforeEach(function () {
        config = {
          ntlmHosts: ["localhost:5000"],
          username: "nisse",
          password: "manpwr",
          ntlmVersion: 2,
        };
      });

      it("Valid username succeeds", function () {
        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.true;
      });

      it("Does return error if username is too long", function () {
        // Arrange
        config.username = "a".repeat(105);

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal("Username contains invalid characters or is too long.");
      });

      it("Does return error if username contains invalid chars", function () {
        // Arrange
        config.username = "a*a";

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal("Username contains invalid characters or is too long.");
      });
    });

    describe("domain", function () {
      let config: NtlmConfig;

      beforeEach(function () {
        config = {
          ntlmHosts: ["localhost:5000"],
          username: "nisse",
          password: "manpwr",
          ntlmVersion: 2,
        };
      });

      it("Valid domain succeeds", function () {
        // Arrange
        config.domain = "mptest";

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.true;
      });

      it("Does return error if domain is too long", function () {
        // Arrange
        config.domain = "a".repeat(16);

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal("Domain contains invalid characters or is too long.");
      });

      it("Does return error if domain contains invalid chars", function () {
        // Arrange
        config.domain = "a*a";

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal("Domain contains invalid characters or is too long.");
      });
    });

    describe("workstation", function () {
      let config: NtlmConfig;

      beforeEach(function () {
        config = {
          ntlmHosts: ["localhost:5000"],
          username: "nisse",
          password: "manpwr",
          ntlmVersion: 2,
        };
      });

      it("Valid workstation succeeds", function () {
        // Arrange
        config.workstation = "testpc";

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.true;
      });

      it("Does return error if workstation is too long", function () {
        // Arrange
        let workstation = "a".repeat(16);
        config.workstation = workstation;

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal(
            "Workstation contains invalid characters or is too long."
          );
      });

      it("Does return error if workstation contains invalid chars", function () {
        // Arrange
        let workstation = "a*a";
        config.workstation = workstation;

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal(
            "Workstation contains invalid characters or is too long."
          );
      });
    });

    describe("ntlmVersion", function () {
      let config: NtlmConfig;

      beforeEach(function () {
        config = {
          ntlmHosts: ["localhost:5000"],
          username: "nisse",
          password: "manpwr",
          ntlmVersion: 2,
        };
      });

      it("ntlmVersion 1 succeeds", function () {
        // Arrange
        config.ntlmVersion = 1;

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.true;
      });

      it("ntlmVersion 2 succeeds", function () {
        // Arrange
        config.ntlmVersion = 2;

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.true;
      });

      it("ntlmVersion -1 fails", function () {
        // Arrange
        config.ntlmVersion = -1;

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal("Invalid ntlmVersion. Must be 1 or 2.");
      });

      it("ntlmVersion 200 fails", function () {
        // Arrange
        config.ntlmVersion = 200;

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal("Invalid ntlmVersion. Must be 1 or 2.");
      });
    });

    describe("required fields", function () {
      let config: NtlmConfig;

      beforeEach(function () {
        config = {
          ntlmHosts: ["localhost:5000"],
          username: "nisse",
          password: "manpwr",
          ntlmVersion: 2,
        };
      });

      it("Does return error if ntlmHosts is missing", function () {
        // Arrange
        delete config.ntlmHosts;

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal(
            "Incomplete configuration. ntlmHosts, username, password and ntlmVersion are required fields."
          );
      });

      it("Does return error if username is missing", function () {
        // Arrange
        delete config.username;

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal(
            "Incomplete configuration. ntlmHosts, username, password and ntlmVersion are required fields."
          );
      });

      it("Does return error if password is missing", function () {
        // Arrange
        delete config.password;

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal(
            "Incomplete configuration. ntlmHosts, username, password and ntlmVersion are required fields."
          );
      });

      it("Does return error if ntlmVersion is missing", function () {
        // Arrange
        delete config.ntlmVersion;

        // Act
        let result = ConfigValidator.validate(config);

        // Assert
        chai.expect(result.ok).to.be.false;
        chai
          .expect(result.message)
          .to.be.equal(
            "Incomplete configuration. ntlmHosts, username, password and ntlmVersion are required fields."
          );
      });
    });
  });

  describe("validateLegacy", function () {
    it("Valid ntlmHost succeeds", function () {
      // Act
      let ntlmHost = "http://google.com:80";
      let result = ConfigValidator.validateLegacy(ntlmHost);

      // Assert
      chai.expect(result.ok).to.be.true;
    });

    it("Does return error if ntlmHost contains path", function () {
      // Arrange
      let ntlmHost = "http://localhost:5000/search";

      // Act
      let result = ConfigValidator.validateLegacy(ntlmHost);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai
        .expect(result.message)
        .to.be.equal(
          "Invalid ntlmHost, must not contain any path or query (https://www.google.com is ok, https://www.google.com/search is not ok)"
        );
    });

    it("Does return error if ntlmHost is incomplete", function () {
      // Arrange
      let ntlmHost = "localhost:5000";

      // Act
      let result = ConfigValidator.validateLegacy(ntlmHost);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai
        .expect(result.message)
        .to.be.equal(
          "Invalid ntlmHost, must be a valid URL (like https://www.google.com)"
        );
    });
  });

  describe("convertLegacy", function () {
    it("should convert to array without protocol", function () {
      // Act
      let ntlmHost = "http://google.com";
      let result = ConfigValidator.convertLegacy(ntlmHost);

      // Assert
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0]).to.equal("google.com");
    });

    it("should convert to array without protocol and preserve port", function () {
      // Act
      let ntlmHost = "http://google.com:8080";
      let result = ConfigValidator.convertLegacy(ntlmHost);

      // Assert
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0]).to.equal("google.com:8080");
    });

    it("should convert to array without protocol and without auth", function () {
      // Act
      let ntlmHost = "http://nisse:test@google.com:8080";
      let result = ConfigValidator.convertLegacy(ntlmHost);

      // Assert
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0]).to.equal("google.com:8080");
    });
  });
});
