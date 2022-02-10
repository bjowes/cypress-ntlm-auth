// cSpell:ignore nisse, mnpwr, mptest

import assert from "assert";

//const proxyFacade = require('./proxyFacade');
import { ProxyFacade } from "./proxy.facade";
import { DependencyInjection } from "../../../src/proxy/dependency.injection";
import { TYPES } from "../../../src/proxy/dependency.injection.types";
import { IConfigServer } from "../../../src/proxy/interfaces/i.config.server";
import { IConfigStore } from "../../../src/proxy/interfaces/i.config.store";
import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";
import { IPortsConfigStore } from "../../../src/proxy/interfaces/i.ports.config.store";
import { describeIfNotWindows, describeIfWindows } from "../conditions";
import { URLExt } from "../../../src/util/url.ext";

describe("Config API (ConfigServer deep tests)", () => {
  let configApiUrl: string;
  let dependencyInjection = new DependencyInjection();
  let configServer: IConfigServer;
  let configStore: IConfigStore;
  let portsConfigStore: IPortsConfigStore;
  let hostConfig: NtlmConfig;

  before(async function () {
    configServer = dependencyInjection.get<IConfigServer>(TYPES.IConfigServer);
    // Cannot resolve these from DI since that would yield new instances
    configStore = (configServer as any)["_configController"]["_configStore"];
    portsConfigStore = (configServer as any)["_configController"]["_portsConfigStore"];
    configServer.init();
    configApiUrl = await configServer.start();
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
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 400);
      assert.equal(res.data, "Config parse error. Username contains invalid characters or is too long.");
      assert.equal(configStore.exists(new URLExt("http://localhost:5000")), false);
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
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 400);
      assert.equal(res.data, "Config parse error. Domain contains invalid characters or is too long.");
      assert.equal(configStore.exists(new URLExt("http://localhost:5000")), false);
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
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 400);
      assert.equal(
        res.data,
        "Config parse error. Invalid host [localhost:5000/search] in ntlmHosts, must be one of: 1) a hostname or FQDN, wildcards accepted. 2) hostname or FQDN with port, wildcards not accepted (localhost:8080 or www.google.com or *.acme.com are ok, https://www.google.com:443/search is not ok)."
      );
      assert.equal(configStore.exists(new URLExt("http://localhost:5000")), false);
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
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 400);
      assert.equal(
        res.data,
        "Config parse error. Invalid host [http://localhost:5000] in ntlmHosts, must be one of: 1) a hostname or FQDN, wildcards accepted. 2) hostname or FQDN with port, wildcards not accepted (localhost:8080 or www.google.com or *.acme.com are ok, https://www.google.com:443/search is not ok)."
      );
      assert.equal(configStore.exists(new URLExt("http://localhost:5000")), false);
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
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 200);
      assert.equal(res.data, "OK");
      assert.equal(configStore.exists(new URLExt("http://localhost:5000")), true);
      assert.equal(configStore.exists(new URLExt("http://www.acme.org")), true);
      assert.equal(configStore.exists(new URLExt("http://google.com")), true);
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
      let completeUrl = new URLExt("http://localhost:5000");

      // Act
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 200);
      assert.equal(res.data, "OK");
      assert.equal(configStore.exists(completeUrl), true);
      assert.equal(configStore.get(completeUrl)!.username, "nisse");

      hostConfig.username = "dummy";
      res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      assert.equal(res.status, 200);
      assert.equal(res.data, "OK");
      assert.equal(configStore.exists(completeUrl), true);
      assert.equal(configStore.get(completeUrl)!.username, "dummy");
    });
  });

  describeIfWindows("ntlm-sso on Window", function () {
    it("should return ok if the config is ok", async function () {
      // Arrange
      let ssoConfig: NtlmSsoConfig = {
        ntlmHosts: ["localhost"],
      };

      // Act
      let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig);
      assert.equal(res.status, 200);
      assert.equal(res.data, "OK");
      assert.equal(configStore.useSso(new URLExt("http://localhost:5000")), true);
    });

    it("should return bad request if the ntlmHosts includes anything else than hostnames / FQDNs", async function () {
      // Arrange
      let ssoConfig: NtlmSsoConfig = {
        ntlmHosts: ["localhost", "https://google.com"],
      };

      // Act
      let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig);
      assert.equal(res.status, 400);
      assert.equal(
        res.data,
        "SSO config parse error. Invalid host [https://google.com] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
      );
      assert.equal(configStore.useSso(new URLExt("http://localhost:5000")), false);
      assert.equal(configStore.useSso(new URLExt("https://google.com")), false);
    });

    it("should allow reconfiguration", async function () {
      // Arrange
      let ssoConfig: NtlmSsoConfig = {
        ntlmHosts: ["localhost"],
      };
      let ssoConfig2: NtlmSsoConfig = {
        ntlmHosts: ["nisse.com", "assa.com"],
      };

      // Act
      let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig);
      assert.equal(res.status, 200);
      assert.equal(res.data, "OK");
      assert.equal(configStore.useSso(new URLExt("http://localhost:5000")), true);

      res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig2);
      assert.equal(res.status, 200);
      assert.equal(res.data, "OK");
      assert.equal(configStore.useSso(new URLExt("http://assa.com:5000")), true);
      assert.equal(configStore.useSso(new URLExt("http://localhost:5000")), false);
    });
  });

  describeIfNotWindows("ntlm-sso on non-Window", function () {
    it("should return fail even if the config is ok", async function () {
      // Arrange
      let ssoConfig: NtlmSsoConfig = {
        ntlmHosts: ["localhost"],
      };

      // Act
      let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig);
      assert.equal(res.status, 400);
      assert.equal(res.data, "SSO is not supported on this platform. Only Windows OSs are supported.");
      assert.equal(configStore.useSso(new URLExt("http://localhost:5000")), false);
    });
  });

  describe("reset", function () {
    it("should return response", async function () {
      // Act
      let res = await ProxyFacade.sendNtlmReset(configApiUrl);
      assert.equal(res.status, 200);
      assert.equal(res.data, "OK");
    });
  });

  describe("alive", function () {
    it("should return response", async function () {
      portsConfigStore.ntlmProxyUrl = new URLExt("http://localhost:8012");
      // Act
      let res = await ProxyFacade.sendAliveRequest(configApiUrl);
      assert.equal(res.status, 200);
      assert.equal(res.data.configApiUrl, configApiUrl);
      assert.equal(res.data.ntlmProxyUrl, portsConfigStore.ntlmProxyUrl.origin);
    });
  });
});
