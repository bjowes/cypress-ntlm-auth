// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import assert from "assert";

import { IConfigStore } from "../../../src/proxy/interfaces/i.config.store";
import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";
import { ConfigStore } from "../../../src/proxy/config.store";
import { URLExt } from "../../../src/util/url.ext";

describe("ConfigStore", () => {
  let configStore: IConfigStore;
  let hostConfig: NtlmConfig;
  let ssoConfig: NtlmSsoConfig;

  beforeEach(function () {
    configStore = new ConfigStore();
  });

  describe("get", function () {
    it("should return hostname with port match if multiple matches exists in ntlmHosts", function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["www.acme.org"],
        username: "nisse\\nisse",
        password: "dummy2",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);
      hostConfig = {
        ntlmHosts: ["www.acme.org:5000"],
        username: "nisse\\nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);
      hostConfig = {
        ntlmHosts: ["*.acme.org"],
        username: "nisse\\nisse",
        password: "dummy3",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);

      // Act
      let res = configStore.get(new URLExt("http://www.acme.org:5000"));

      // Assert
      assert.equal(res!.password, "dummy");
    });

    it("should return hostname match if multiple matches exists in ntlmHosts but no hostname with port match exists", function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["www.acme.org:5001"],
        username: "nisse\\nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);
      hostConfig = {
        ntlmHosts: ["www.acme.org"],
        username: "nisse\\nisse",
        password: "dummy2",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);
      hostConfig = {
        ntlmHosts: ["*.acme.org"],
        username: "nisse\\nisse",
        password: "dummy3",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);

      // Act
      let res = configStore.get(new URLExt("http://www.acme.org:5000"));

      // Assert
      assert.ok(res);
      assert.equal(res!.password, "dummy2");
    });

    it("should return wildcard match if no other matches exists in ntlmHosts", function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["www.acme.org:5001"],
        username: "nisse\\nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);
      hostConfig = {
        ntlmHosts: ["www.acmey.org"],
        username: "nisse\\nisse",
        password: "dummy2",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);
      hostConfig = {
        ntlmHosts: ["*.acme.org"],
        username: "nisse\\nisse",
        password: "dummy3",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);

      // Act
      let res = configStore.get(new URLExt("http://www.acme.org:5000"));

      // Assert
      assert.ok(res);
      assert.equal(res!.password, "dummy3");
    });
  });

  describe("existsOrUseSso", function () {
    it("should return true if exact match of host exists in ntlmHosts", function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["*.acme.org", "google.com", "localhost:5000"],
        username: "nisse\\nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);

      // Act
      let res = configStore.existsOrUseSso(new URLExt("http://localhost:5000"));

      // Assert
      assert.equal(res, true);
    });

    it("should return false if port mismatch of host in ntlmHosts", function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["*.acme.org", "google.com", "localhost:5000"],
        username: "nisse\\nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);

      // Act
      let res = configStore.existsOrUseSso(new URLExt("http://localhost:5001"));

      // Assert
      assert.equal(res, false);
    });

    it("should return false if hostname mismatch of host in ntlmHosts", function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["*.acme.org", "google.com", "localhost:5000"],
        username: "nisse\\nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);

      // Act
      let res = configStore.existsOrUseSso(new URLExt("http://localhosty:5000"));

      // Assert
      assert.equal(res, false);
    });

    it("should return true if hostname exists in ntlmSso", function () {
      // Arrange
      ssoConfig = {
        ntlmHosts: ["localhost", "google.com"],
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.existsOrUseSso(new URLExt("http://localhost:5000"));

      // Assert
      assert.equal(res, true);
    });

    it("should return false if hostname does not exist in ntlmSso", function () {
      // Arrange
      ssoConfig = {
        ntlmHosts: ["localhost", "google.com"],
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.existsOrUseSso(new URLExt("http://localhostt:5000"));

      // Assert
      assert.equal(res, false);
    });

    it("should return true if hostname matches single wildcard in ntlmSso", function () {
      // Arrange
      ssoConfig = {
        ntlmHosts: ["localhost", "*.google.com"],
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.existsOrUseSso(new URLExt("http://api.google.com"));

      // Assert
      assert.equal(res, true);
    });

    it("should return true if hostname matches multiple wildcard in ntlmSso", function () {
      // Arrange
      ssoConfig = {
        ntlmHosts: ["localhost", "*.google.com", "a.*.b.*.com"],
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.existsOrUseSso(new URLExt("http://a.google.more.b.nothing.com"));

      // Assert
      assert.equal(res, true);
    });

    it("should return false if hostname does not match multiple wildcard in ntlmSso", function () {
      // Arrange
      ssoConfig = {
        ntlmHosts: ["localhost", "*.google.com", "a.*.b.*.com"],
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.existsOrUseSso(new URLExt("http://a.google.more.b.com"));

      // Assert
      assert.equal(res, false);
    });
  });

  describe("useSso", function () {
    it("should return false if exact match of host exists in ntlmHosts", function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["localhost:5000"],
        username: "nisse\\nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);

      // Act
      let res = configStore.useSso(new URLExt("http://localhost:5000"));

      // Assert
      assert.equal(res, false);
    });

    it("should return false if exact match of host exists in ntlmHosts and ntlmSsoHosts", function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["localhost:5000"],
        username: "nisse\\nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);
      ssoConfig = {
        ntlmHosts: ["localhost", "*.google.com"],
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.useSso(new URLExt("http://localhost:5000"));

      // Assert
      assert.equal(res, false);
    });

    it("should return true if exact match of host exists in ntlmSsoHosts but not in ntlmHosts", function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["localhosty:5000"],
        username: "nisse\\nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);
      ssoConfig = {
        ntlmHosts: ["localhost", "*.google.com"],
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.useSso(new URLExt("http://localhost:5000"));

      // Assert
      assert.equal(res, true);
    });

    it("should return true if wildcard match of host exists in ntlmSsoHosts but no exact match in ntlmHosts", function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["localhost:5000"],
        username: "nisse\\nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };
      configStore.updateConfig(hostConfig);
      ssoConfig = {
        ntlmHosts: ["localhost", "*.google.com"],
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.useSso(new URLExt("http://api.google.com:5000"));

      // Assert
      assert.equal(res, true);
    });
  });
});
