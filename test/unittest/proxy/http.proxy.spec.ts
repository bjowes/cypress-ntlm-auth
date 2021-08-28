// cSpell:ignore nisse, mptst
import "mocha";

import { ExpressServer } from "./express.server";
import { ProxyFacade } from "./proxy.facade";

import chaiAsPromised from "chai-as-promised";
import chai from "chai";
const expect = chai.expect;
chai.use(chaiAsPromised);

import http from "http";

import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { DependencyInjection } from "../../../src/proxy/dependency.injection";
import { TYPES } from "../../../src/proxy/dependency.injection.types";
import { ICoreServer } from "../../../src/proxy/interfaces/i.core.server";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";
import { osSupported } from "win-sso";
import { fail } from "assert";

let configApiUrl: string;
let ntlmProxyUrl: string;
let httpUrl: string;

describe("Proxy for HTTP host with NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before("Start HTTP server and proxy", async function () {
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(true, undefined);
    ntlmHostConfig = {
      ntlmHosts: [httpUrl.replace("http://", "")],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after("Stop HTTP server and proxy", async function () {
    await coreServer.stop();
    await expressServer.stopHttpServer();
  });

  beforeEach("Reset NTLM config", async function () {
    this.timeout(2000);

    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it("should handle authentication for GET requests", async function () {
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal("Expecting larger payload on GET");
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on GET requests", async function () {
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    expect(res.status, "remote request should return 401").to.be.equal(401);
  });

  it("should handle authentication for POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body);
    expect(res.status, "remote request should return 401").to.be.equal(401);
  });

  it("should handle authentication for PUT requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "PUT", "/put", body);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on PUT requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "PUT", "/put", body);
    expect(res.status, "remote request should return 401").to.be.equal(401);
  });

  it("should handle authentication for DELETE requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "DELETE", "/delete", body);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on DELETE requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "DELETE", "/delete", body);
    expect(res.status, "remote request should return 401").to.be.equal(401);
  });

  it("should handle authentication for multiple POST requests on one socket", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let agent = new http.Agent({ keepAlive: true });
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate on first request").to.be.true;

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should not authenticate on additional request on same socket"
    ).to.be.false;

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should not authenticate on additional request on same socket"
    ).to.be.false;

    agent.destroy();
  });

  it("should re-authentication after reset on one socket", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let agent = new http.Agent({ keepAlive: true });
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate on first request").to.be.true;

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should not authenticate on additional request on same socket"
    ).to.be.false;

    res = await ProxyFacade.sendNtlmReset(configApiUrl);
    expect(res.status, "ntlm-reset should return 200").to.be.equal(200);
    res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate after reset").to.be.true;

    agent.destroy();
  });

  it("should not re-authentication after reconfiguration on one socket", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let agent = new http.Agent({ keepAlive: true });
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate on first request").to.be.true;

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should not authenticate on additional request on same socket"
    ).to.be.false;

    res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should not authenticate on additional request on same socket - we should only authenticate when the server requires it"
    ).to.be.false;

    agent.destroy();
  });

  it("should re-authentication when required by server", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let agent = new http.Agent({ keepAlive: true });
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate on first request").to.be.true;

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should not authenticate on additional request on same socket"
    ).to.be.false;

    expressServer.sendWwwAuthOnce("NTLM");

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate when server sends 401").to.be.true;

    agent.destroy();
  });

  it("should re-authentication after reconfiguration when required by server", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let agent = new http.Agent({ keepAlive: true });
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate on first request").to.be.true;

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should not authenticate on additional request on same socket"
    ).to.be.false;

    res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);
    expressServer.sendWwwAuthOnce("NTLM");

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate when server sends 401").to.be.true;

    agent.destroy();
  });

  it("should re-authenticate after failed auth when required by server", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let agent = new http.Agent({ keepAlive: true });
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);

    expressServer.sendWwwAuth([
      { header: "NTLM", status: 401 },
      { header: "NTLM", status: 401 },
    ]);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 401").to.be.equal(401);
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate on first request").to.be.true;

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate on second request").to.be.true;

    agent.destroy();
  });

  it("should terminate client socket on server socket error for NTLM host", async function () {
    const res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);
    expressServer.closeConnectionOnNextRequest(true);
    try {
      await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
      fail("Should throw on closed connection");
    } catch (err: any) {
      expect(err.message, "Client socket should be terminated").to.be.equal("socket hang up");
    }
  });

  it("should pass on custom status phrases in response", async function () {
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);
    expressServer.setCustomStatusPhrase('My fantastic status phrase');
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    expect(res.statusText, "remote request should return custom status phrase").to.be.equal('My fantastic status phrase');
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal("Expecting larger payload on GET");
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
  });
});

describe("Proxy for HTTP host with NTLM using SSO", function () {
  let ntlmSsoConfig: NtlmSsoConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before("Start HTTP server and proxy", async function () {
    // Check SSO support
    if (osSupported() === false) {
      this.skip();
      return;
    }

    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(true, undefined);

    ntlmSsoConfig = {
      ntlmHosts: ["localhost"],
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after("Stop HTTP server and proxy", async function () {
    if (coreServer) {
      await coreServer.stop();
      await expressServer.stopHttpServer();
    }
  });

  beforeEach("Reset NTLM config", async function () {
    this.timeout(2000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it("should handle authentication for GET requests", async function () {
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status, "ntlm-sso-config should return 200").to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal("Expecting larger payload on GET");
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on GET requests", async function () {
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    expect(res.status, "remote request should return 401").to.be.equal(401);
  });

  it("should handle authentication for POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status, "ntlm-sso-config should return 200").to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
  });

  it("should handle authentication for multiple POST requests on one socket", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let agent = new http.Agent({ keepAlive: true });
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status, "ntlm-sso-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate on first request").to.be.true;

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should not authenticate on additional request on same socket"
    ).to.be.false;

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should not authenticate on additional request on same socket"
    ).to.be.false;

    agent.destroy();
  });

  it("should re-authentication after reset on one socket", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let agent = new http.Agent({ keepAlive: true });
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status, "ntlm-sso-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate on first request").to.be.true;

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should not authenticate on additional request on same socket"
    ).to.be.false;

    res = await ProxyFacade.sendNtlmReset(configApiUrl);
    expect(res.status, "ntlm-reset should return 200").to.be.equal(200);
    res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status, "ntlm-sso-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate after reset").to.be.true;

    agent.destroy();
  });

  it("should not re-authentication after reconfiguration on one socket", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let agent = new http.Agent({ keepAlive: true });
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status, "ntlm-sso-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate on first request").to.be.true;

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should not authenticate on additional request on same socket"
    ).to.be.false;

    res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status, "ntlm-sso-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should not authenticate on additional request on same socket - we should only authenticate when the server requires it"
    ).to.be.false;

    agent.destroy();
  });

  it("should re-authentication when required by server", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let agent = new http.Agent({ keepAlive: true });
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status, "ntlm-sso-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate on first request").to.be.true;

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should not authenticate on additional request on same socket"
    ).to.be.false;

    expressServer.sendWwwAuthOnce("NTLM");

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body, undefined, agent);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(expressServer.lastRequestContainedAuthHeader(), "should authenticate when server sends 401").to.be.true;

    agent.destroy();
  });
});

describe("Proxy for HTTP host without NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before("Start HTTP server and proxy", async function () {
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(false, undefined);
    ntlmHostConfig = {
      ntlmHosts: [httpUrl.replace("http://", "")],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after("Stop HTTP server and proxy", async function () {
    await coreServer.stop();
    await expressServer.stopHttpServer();
  });

  beforeEach("Restore timeout", () => {
    this.timeout(2000);
  });

  it("should pass through GET requests for non NTLM host", async function () {
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal("Expecting larger payload on GET");
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
  });

  it("should pass through POST requests for non NTLM host", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
  });

  it("should pass through PUT requests for non NTLM host", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "PUT", "/put", body);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
  });

  it("should pass through DELETE requests for non NTLM host", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "DELETE", "/delete", body);
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
  });

  it("should terminate client socket on server socket error for non NTLM host", async function () {
    expressServer.closeConnectionOnNextRequest(true);
    try {
      await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
      fail("Should throw on closed connection");
    } catch (err: any) {
      expect((err).message, "Client socket should be terminated").to.be.equal("socket hang up");
    }
  });
});

describe("Proxy for multiple HTTP hosts with NTLM", function () {
  let ntlmHostConfig1: NtlmConfig;
  let ntlmHostConfig2: NtlmConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer1 = new ExpressServer();
  let expressServer2 = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();
  let httpUrl1: string;
  let httpUrl2: string;
  let ntlmHostCombinedConfig: NtlmConfig;

  before("Start HTTP server and proxy", async function () {
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl1 = await expressServer1.startHttpServer(true, undefined);
    httpUrl2 = await expressServer2.startHttpServer(true, undefined);
    ntlmHostConfig1 = {
      ntlmHosts: [httpUrl1.replace("http://", "")],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    ntlmHostConfig2 = {
      ntlmHosts: [httpUrl2.replace("http://", "")],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    ntlmHostCombinedConfig = {
      ntlmHosts: [httpUrl1.replace("http://", ""), httpUrl2.replace("http://", "")],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after("Stop HTTP server and proxy", async function () {
    await coreServer.stop();
    await expressServer1.stopHttpServer();
    await expressServer2.stopHttpServer();
  });

  beforeEach("Reset NTLM config", async function () {
    this.timeout(2000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  describe("Multiple NtlmConfig calls", function () {
    it("should handle authentication for POST requests to two hosts", async function () {
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig1);
      expect(res.status, "ntlm-config should return 200").to.be.equal(200);
      res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig2);
      expect(res.status, "ntlm-config should return 200").to.be.equal(200);

      let body = {
        ntlmHost: "https://my.test.host/",
      };

      res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl1, "POST", "/post", body);
      expect(res.status, "remote request should return 200").to.be.equal(200);
      let resBody = res.data as any;
      expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
      expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

      res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl2, "POST", "/post", body);
      expect(res.status, "remote request should return 200").to.be.equal(200);
      resBody = res.data as any;
      expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
      expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    });

    it("should handle authentication for POST requests to two hosts from one socket", async function () {
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig1);
      expect(res.status, "ntlm-config should return 200").to.be.equal(200);
      res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig2);
      expect(res.status, "ntlm-config should return 200").to.be.equal(200);

      let body = {
        ntlmHost: "https://my.test.host/",
      };
      let agent = new http.Agent({ keepAlive: true });

      res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl1, "POST", "/post", body, undefined, agent);
      expect(res.status, "remote request should return 200").to.be.equal(200);
      let resBody = res.data as any;
      expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
      expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

      res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl2, "POST", "/post", body, undefined, agent);
      expect(res.status, "remote request should return 200").to.be.equal(200);
      resBody = res.data as any;
      expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
      expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

      agent.destroy();
    });
  });

  describe("Combined NtlmConfig call", function () {
    it("should handle authentication for POST requests to two hosts", async function () {
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostCombinedConfig);
      expect(res.status, "ntlm-config should return 200").to.be.equal(200);

      let body = {
        ntlmHost: "https://my.test.host/",
      };

      res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl1, "POST", "/post", body);
      expect(res.status, "remote request should return 200").to.be.equal(200);
      let resBody = res.data as any;
      expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
      expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

      res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl2, "POST", "/post", body);
      expect(res.status, "remote request should return 200").to.be.equal(200);
      resBody = res.data as any;
      expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
      expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    });

    it("should handle authentication for POST requests to two hosts from one socket", async function () {
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostCombinedConfig);
      expect(res.status, "ntlm-config should return 200").to.be.equal(200);

      let body = {
        ntlmHost: "https://my.test.host/",
      };
      let agent = new http.Agent({ keepAlive: true });

      res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl1, "POST", "/post", body, undefined, agent);
      expect(res.status, "remote request should return 200").to.be.equal(200);
      let resBody = res.data as any;
      expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
      expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

      res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl2, "POST", "/post", body, undefined, agent);
      expect(res.status, "remote request should return 200").to.be.equal(200);
      resBody = res.data as any;
      expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
      expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

      agent.destroy();
    });
  });
});
