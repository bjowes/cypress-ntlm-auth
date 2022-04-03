// cSpell:ignore nisse, mnpwr, mptest

import assert from "assert";

import { ProxyFacade } from "./proxy.facade";
import { DependencyInjection } from "../../../src/proxy/dependency.injection";
import { TYPES } from "../../../src/proxy/dependency.injection.types";
import { IConfigServer } from "../../../src/proxy/interfaces/i.config.server";
import { IConfigStore } from "../../../src/proxy/interfaces/i.config.store";
import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";
import { IPortsConfigStore } from "../../../src/proxy/interfaces/i.ports.config.store";
import { describeIfNotWindows, describeIfWindows } from "../conditions";

describe("Config API (ConfigServer deep tests)", () => {
  let configApiUrl: URL;
  let dependencyInjection = new DependencyInjection();
  let configServer: IConfigServer;
  let configStore: IConfigStore;
  let portsConfigStore: IPortsConfigStore;
  let hostConfig: NtlmConfig;

  before(async function () {
    configServer = dependencyInjection.get<IConfigServer>(TYPES.IConfigServer);
    // Cannot resolve these from DI since that would yield new instances
    configStore = (configServer as any)["_configController"]["_configStore"];
    portsConfigStore = (configServer as any)["_configController"][
      "_portsConfigStore"
    ];
    configServer.init();
    configApiUrl = new URL(await configServer.start());
  });

  beforeEach(function () {
    configStore.clear();
  });

  after(async function () {
    await configServer.stop();
  });

  describe("ntlm-config", function () {
    it("should return bad request if the username contains backslash", async function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["*.acme.org", "google.com", "localhost:5000"],
        username: "nisse\\nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };

      // Act
      const res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 400);
      assert.equal(
        res.body,
        "Config parse error. Username contains invalid characters or is too long."
      );
      assert.equal(configStore.exists(new URL("http://localhost:5000")), false);
    });

    it("should return bad request if the domain contains backslash", async function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["*.acme.org", "google.com", "localhost:5000"],
        username: "nisse",
        password: "dummy",
        domain: "mptest\\mptest",
        ntlmVersion: 2,
      };

      // Act
      const res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 400);
      assert.equal(
        res.body,
        "Config parse error. Domain contains invalid characters or is too long."
      );
      assert.equal(configStore.exists(new URL("http://localhost:5000")), false);
    });

    it("should return bad request if the ntlmHost includes a path", async function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["*.acme.org", "google.com", "localhost:5000/search"],
        username: "nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };

      // Act
      const res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 400);
      assert.equal(
        res.body,
        "Config parse error. Invalid host [localhost:5000/search] in ntlmHosts, must be one of: 1) a hostname or FQDN, wildcards accepted. 2) hostname or FQDN with port, wildcards not accepted (localhost:8080 or www.google.com or *.acme.com are ok, https://www.google.com:443/search is not ok)."
      );
      assert.equal(configStore.exists(new URL("http://localhost:5000")), false);
    });

    it("should return bad request if the ntlmHost includes a protocol", async function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["*.acme.org", "google.com", "http://localhost:5000"],
        username: "nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };

      // Act
      const res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 400);
      assert.equal(
        res.body,
        "Config parse error. Invalid host [http://localhost:5000] in ntlmHosts, must be one of: 1) a hostname or FQDN, wildcards accepted. 2) hostname or FQDN with port, wildcards not accepted (localhost:8080 or www.google.com or *.acme.com are ok, https://www.google.com:443/search is not ok)."
      );
      assert.equal(configStore.exists(new URL("http://localhost:5000")), false);
    });

    it("should return ok if the config is ok", async function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["*.acme.org", "google.com", "localhost:5000"],
        username: "nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };

      // Act
      const res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 200);
      assert.equal(res.body, "OK");
      assert.equal(configStore.exists(new URL("http://localhost:5000")), true);
      assert.equal(configStore.exists(new URL("http://www.acme.org")), true);
      assert.equal(configStore.exists(new URL("http://google.com")), true);
    });

    it("should allow reconfiguration", async function () {
      // Arrange
      hostConfig = {
        ntlmHosts: ["*.acme.org", "google.com", "localhost:5000"],
        username: "nisse",
        password: "dummy",
        domain: "mptest",
        ntlmVersion: 2,
      };
      const completeUrl = new URL("http://localhost:5000");

      // Act
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 200);
      assert.equal(res.body, "OK");
      assert.equal(configStore.exists(completeUrl), true);
      assert.equal(configStore.get(completeUrl)!.username, "nisse");

      hostConfig.username = "dummy";
      res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 200);
      assert.equal(res.body, "OK");
      assert.equal(configStore.exists(completeUrl), true);
      assert.equal(configStore.get(completeUrl)!.username, "dummy");
    });
  });

  describeIfWindows("ntlm-sso on Window", function () {
    it("should return ok if the config is ok", async function () {
      // Arrange
      const ssoConfig: NtlmSsoConfig = {
        ntlmHosts: ["localhost"],
      };

      // Act
      const res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig);
      assert.equal(res.status, 200);
      assert.equal(res.body, "OK");
      assert.equal(configStore.useSso(new URL("http://localhost:5000")), true);
    });

    it("should return bad request if the ntlmHosts includes anything else than hostnames / FQDNs", async function () {
      // Arrange
      const ssoConfig: NtlmSsoConfig = {
        ntlmHosts: ["localhost", "https://google.com"],
      };

      // Act
      const res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig);
      assert.equal(res.status, 400);
      assert.equal(
        res.body,
        "SSO config parse error. Invalid host [https://google.com] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
      );
      assert.equal(configStore.useSso(new URL("http://localhost:5000")), false);
      assert.equal(configStore.useSso(new URL("https://google.com")), false);
    });

    it("should allow reconfiguration", async function () {
      // Arrange
      const ssoConfig: NtlmSsoConfig = {
        ntlmHosts: ["localhost"],
      };
      const ssoConfig2: NtlmSsoConfig = {
        ntlmHosts: ["nisse.com", "assa.com"],
      };

      // Act
      let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig);
      assert.equal(res.status, 200);
      assert.equal(res.body, "OK");
      assert.equal(configStore.useSso(new URL("http://localhost:5000")), true);

      res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig2);
      assert.equal(res.status, 200);
      assert.equal(res.body, "OK");
      assert.equal(configStore.useSso(new URL("http://assa.com:5000")), true);
      assert.equal(configStore.useSso(new URL("http://localhost:5000")), false);
    });
  });

  describeIfNotWindows("ntlm-sso on non-Window", function () {
    it("should return fail even if the config is ok", async function () {
      // Arrange
      const ssoConfig: NtlmSsoConfig = {
        ntlmHosts: ["localhost"],
      };

      // Act
      const res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig);
      assert.equal(res.status, 400);
      assert.equal(
        res.body,
        "SSO is not supported on this platform. Only Windows OSs are supported."
      );
      assert.equal(configStore.useSso(new URL("http://localhost:5000")), false);
    });
  });

  describe("reset", function () {
    it("should return response", async function () {
      // Act
      const res = await ProxyFacade.sendNtlmReset(configApiUrl);
      assert.equal(res.status, 200);
      assert.equal(res.body, "OK");
    });
  });

  describe("alive", function () {
    it("should return response", async function () {
      portsConfigStore.ntlmProxyUrl = new URL("http://localhost:8012");
      // Act
      const res = await ProxyFacade.sendAliveRequest(configApiUrl);
      assert.equal(res.status, 200);
      assert.equal(res.data.configApiUrl, configApiUrl.origin);
      assert.equal(res.data.ntlmProxyUrl, portsConfigStore.ntlmProxyUrl.origin);
    });
  });
});
