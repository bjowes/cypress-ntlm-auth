// cSpell:ignore nisse, mnpwr, mptest
import "mocha";

//const proxyFacade = require('./proxyFacade');
import { ProxyFacade } from "./proxy.facade";
import { expect } from "chai";
import { toCompleteUrl } from "../../src/util/url.converter";
import { DependencyInjection } from "../../src/proxy/dependency.injection";
import { TYPES } from "../../src/proxy/dependency.injection.types";
import { IConfigServer } from "../../src/proxy/interfaces/i.config.server";
import { IConfigStore } from "../../src/proxy/interfaces/i.config.store";
import { NtlmConfig } from "../../src/models/ntlm.config.model";
import { NtlmSsoConfig } from "../../src/models/ntlm.sso.config.model";
import { osSupported } from "win-sso";

describe("Config API (ConfigServer deep tests)", () => {
  let configApiUrl: string;
  let dependencyInjection = new DependencyInjection();
  let configServer: IConfigServer;
  let configStore: IConfigStore;
  let hostConfig: NtlmConfig;

  before(async function () {
    configServer = dependencyInjection.get<IConfigServer>(TYPES.IConfigServer);
    configStore = dependencyInjection.get<IConfigStore>(TYPES.IConfigStore);
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
      expect(res.status).to.equal(400);
      expect(res.data).to.equal(
        "Config parse error. Username contains invalid characters or is too long."
      );
      expect(configStore.exists(toCompleteUrl("localhost:5000", false))).to.be
        .false;
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
      expect(res.status).to.equal(400);
      expect(res.data).to.equal(
        "Config parse error. Domain contains invalid characters or is too long."
      );
      expect(configStore.exists(toCompleteUrl("localhost:5000", false))).to.be
        .false;
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
      expect(res.status).to.equal(400);
      expect(res.data).to.equal(
        "Config parse error. Invalid host [localhost:5000/search] in ntlmHosts, must be one of: 1) a hostname or FQDN, wildcards accepted. 2) hostname or FQDN with port, wildcards not accepted (localhost:8080 or www.google.com or *.acme.com are ok, https://www.google.com:443/search is not ok)."
      );
      expect(configStore.exists(toCompleteUrl("localhost:5000", false))).to.be
        .false;
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
      expect(res.status).to.equal(400);
      expect(res.data).to.equal(
        "Config parse error. Invalid host [http://localhost:5000] in ntlmHosts, must be one of: 1) a hostname or FQDN, wildcards accepted. 2) hostname or FQDN with port, wildcards not accepted (localhost:8080 or www.google.com or *.acme.com are ok, https://www.google.com:443/search is not ok)."
      );
      expect(configStore.exists(toCompleteUrl("localhost:5000", false))).to.be
        .false;
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
      expect(res.status).to.equal(200);
      expect(res.data).to.equal("OK");
      expect(configStore.exists(toCompleteUrl("localhost:5000", false))).to.be
        .true;
      expect(configStore.exists(toCompleteUrl("www.acme.org", false))).to.be
        .true;
      expect(configStore.exists(toCompleteUrl("google.com", false))).to.be.true;
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
      let completeUrl = toCompleteUrl("localhost:5000", false);

      // Act
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      expect(res.status).to.equal(200);
      expect(res.data).to.equal("OK");
      expect(configStore.exists(completeUrl)).to.be.true;
      expect(configStore.get(completeUrl).username).to.be.equal("nisse");

      hostConfig.username = "dummy";
      res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
      expect(res.status).to.equal(200);
      expect(res.data).to.equal("OK");
      expect(configStore.exists(completeUrl)).to.be.true;
      expect(configStore.get(completeUrl).username).to.be.equal("dummy");
    });
  });

  describe("ntlm-sso on Window", function () {
    before("Check SSO support", function () {
      // Check SSO support
      if (osSupported() === false) {
        this.skip();
        return;
      }
    });

    it("should return ok if the config is ok", async function () {
      // Arrange
      let ssoConfig: NtlmSsoConfig = {
        ntlmHosts: ["localhost"],
      };

      // Act
      let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig);
      expect(res.status).to.equal(200);
      expect(res.data).to.equal("OK");
      expect(configStore.useSso(toCompleteUrl("http://localhost:5000", false)))
        .to.be.true;
    });

    it("should return bad request if the ntlmHosts includes anything else than hostnames / FQDNs", async function () {
      // Arrange
      let ssoConfig: NtlmSsoConfig = {
        ntlmHosts: ["localhost", "https://google.com"],
      };

      // Act
      let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig);
      expect(res.status).to.equal(400);
      expect(res.data).to.equal(
        "SSO config parse error. Invalid host [https://google.com] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
      );
      expect(configStore.useSso(toCompleteUrl("http://localhost:5000", false)))
        .to.be.false;
      expect(configStore.useSso(toCompleteUrl("https://google.com", false))).to
        .be.false;
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
      expect(res.status).to.equal(200);
      expect(res.data).to.equal("OK");
      expect(configStore.useSso(toCompleteUrl("http://localhost:5000", false)))
        .to.be.true;

      res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig2);
      expect(res.status).to.equal(200);
      expect(res.data).to.equal("OK");
      expect(configStore.useSso(toCompleteUrl("http://assa.com:5000", false)))
        .to.be.true;
      expect(configStore.useSso(toCompleteUrl("http://localhost:5000", false)))
        .to.be.false;
    });
  });

  describe("ntlm-sso on non-Window", function () {
    before("Check SSO support", function () {
      // Check SSO support
      if (osSupported() === true) {
        this.skip();
        return;
      }
    });

    it("should return fail even if the config is ok", async function () {
      // Arrange
      let ssoConfig: NtlmSsoConfig = {
        ntlmHosts: ["localhost"],
      };

      // Act
      let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ssoConfig);
      expect(res.status).to.equal(400);
      expect(res.data).to.equal(
        "SSO config parse error. SSO is not supported on this platform. Only Windows OSs are supported."
      );
      expect(configStore.useSso(toCompleteUrl("http://localhost:5000", false)))
        .to.be.false;
    });
  });

  describe("reset", function () {
    it("should return response", async function () {
      // Act
      let res = await ProxyFacade.sendNtlmReset(configApiUrl);
      expect(res.status).to.equal(200);
      expect(res.data).to.equal("OK");
    });
  });

  describe("alive", function () {
    it("should return response", async function () {
      // Act
      let res = await ProxyFacade.sendAliveRequest(configApiUrl);
      expect(res.status).to.equal(200);
      expect(res.data).to.equal("OK");
    });
  });
});
