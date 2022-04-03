// cSpell:ignore nisse, mptst

import { ExpressServer } from "./express.server";
import { ProxyFacade } from "./proxy.facade";
import assert from "assert";

import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { DependencyInjection } from "../../../src/proxy/dependency.injection";
import { TYPES } from "../../../src/proxy/dependency.injection.types";
import { ICoreServer } from "../../../src/proxy/interfaces/i.core.server";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";
import { fail } from "assert";
import { describeIfWindows } from "../conditions";

let configApiUrl: URL;
let ntlmProxyUrl: URL;
let httpUrl: URL;

describe("Proxy for HTTP host with NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before(async function () {
    // Start HTTP server and proxy
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(true, undefined);
    ntlmHostConfig = {
      ntlmHosts: [httpUrl.host],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    const ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = new URL(ports.configApiUrl);
    ntlmProxyUrl = new URL(ports.ntlmProxyUrl);
  });

  after(async function () {
    // Stop HTTP server and proxy
    await coreServer.stop();
    await expressServer.stopHttpServer();
  });

  beforeEach(async function () {
    // Reset NTLM config
    this.timeout(2000);

    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it("should handle authentication for GET requests", async function () {
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "GET",
      "/get",
      null
    );
    assert.equal(res.status, 200);
    const resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on GET requests", async function () {
    const res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "GET",
      "/get",
      null
    );
    assert.equal(res.status, 401);
  });

  it("should handle authentication for POST requests", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body
    );
    assert.equal(res.status, 200);
    const resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on POST requests", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body
    );
    assert.equal(res.status, 401);
  });

  it("should handle authentication for PUT requests", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "PUT",
      "/put",
      body
    );
    assert.equal(res.status, 200);
    const resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on PUT requests", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "PUT",
      "/put",
      body
    );
    assert.equal(res.status, 401);
  });

  it("should handle authentication for DELETE requests", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    this.timeout(30000);
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "DELETE",
      "/delete",
      body
    );
    assert.equal(res.status, 200);
    const resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on DELETE requests", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "DELETE",
      "/delete",
      body
    );
    assert.equal(res.status, 401);
  });

  it("should handle authentication for multiple POST requests on one socket", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const agent = ProxyFacade.getHttpProxyAgent(ntlmProxyUrl, true);
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), false);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), false);

    agent.destroy();
  });

  it("should re-authentication after reset on one socket", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const agent = ProxyFacade.getHttpProxyAgent(ntlmProxyUrl, true);
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), false);

    res = await ProxyFacade.sendNtlmReset(configApiUrl);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    agent.destroy();
  });

  it("should not re-authentication after reconfiguration on one socket", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const agent = ProxyFacade.getHttpProxyAgent(ntlmProxyUrl, true);
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), false);

    res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    // "should not authenticate on additional request on same socket - we should only authenticate when the server requires it"
    assert.equal(expressServer.lastRequestContainedAuthHeader(), false);

    agent.destroy();
  });

  it("should re-authentication when required by server", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const agent = ProxyFacade.getHttpProxyAgent(ntlmProxyUrl, true);
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), false);

    expressServer.sendWwwAuthOnce("NTLM");

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    // "should authenticate when server sends 401"
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    agent.destroy();
  });

  it("should re-authentication after reconfiguration when required by server", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const agent = ProxyFacade.getHttpProxyAgent(ntlmProxyUrl, true);
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), false);

    res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    expressServer.sendWwwAuthOnce("NTLM");

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    // "should authenticate when server sends 401"
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    agent.destroy();
  });

  it("should re-authenticate after failed auth when required by server", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const agent = ProxyFacade.getHttpProxyAgent(ntlmProxyUrl, true);
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);

    expressServer.sendWwwAuth([
      { header: "PASS-ON", status: 0 },
      { header: "PASS-ON", status: 0 },
      { header: "NTLM", status: 401 },
    ]);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 401);
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    // Socket is not reused since a 401 result triggers a connection close
    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    const resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    // "should authenticate on second request"
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    agent.destroy();
  });

  it("should terminate client socket on server socket error for NTLM host", async function () {
    const res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    expressServer.closeConnectionOnNextRequest(true);
    try {
      await ProxyFacade.sendProxiedHttpRequest(
        ntlmProxyUrl,
        httpUrl,
        "GET",
        "/get",
        null
      );
      fail("Should throw on closed connection");
    } catch (err) {
      // "Client socket should be terminated"
      assert.equal((err as NodeJS.ErrnoException).message, "socket hang up");
    }
  });

  it("should pass on custom status phrases in response", async function () {
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    expressServer.setCustomStatusPhrase("My fantastic status phrase");
    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "GET",
      "/get",
      null
    );
    assert.equal(res.status, 200);
    // "remote request should return custom status phrase"
    assert.equal(res.statusText, "My fantastic status phrase");
    const resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });
});

describeIfWindows("Proxy for HTTP host with NTLM using SSO", function () {
  let ntlmSsoConfig: NtlmSsoConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before(async function () {
    // Start HTTP server and proxy
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(true, undefined);

    ntlmSsoConfig = {
      ntlmHosts: ["localhost"],
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = new URL(ports.configApiUrl);
    ntlmProxyUrl = new URL(ports.ntlmProxyUrl);
  });

  after(async function () {
    // Stop HTTP server and proxy
    if (coreServer) {
      await coreServer.stop();
      await expressServer.stopHttpServer();
    }
  });

  beforeEach(async function () {
    // Reset NTLM config
    this.timeout(2000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it("should handle authentication for GET requests", async function () {
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "GET",
      "/get",
      null
    );
    assert.equal(res.status, 200);
    const resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on GET requests", async function () {
    const res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "GET",
      "/get",
      null
    );
    assert.equal(res.status, 401);
  });

  it("should handle authentication for POST requests", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body
    );
    assert.equal(res.status, 200);
    const resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should handle authentication for multiple POST requests on one socket", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const agent = ProxyFacade.getHttpProxyAgent(ntlmProxyUrl, true);
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), false);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), false);

    agent.destroy();
  });

  it("should re-authentication after reset on one socket", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const agent = ProxyFacade.getHttpProxyAgent(ntlmProxyUrl, true);
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), false);

    res = await ProxyFacade.sendNtlmReset(configApiUrl);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    agent.destroy();
  });

  it("should not re-authentication after reconfiguration on one socket", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const agent = ProxyFacade.getHttpProxyAgent(ntlmProxyUrl, true);
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), false);

    res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    // "should not authenticate on additional request on same socket - we should only authenticate when the server requires it"
    assert.equal(expressServer.lastRequestContainedAuthHeader(), false);

    agent.destroy();
  });

  it("should re-authentication when required by server", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const agent = ProxyFacade.getHttpProxyAgent(ntlmProxyUrl, true);
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), false);

    expressServer.sendWwwAuthOnce("NTLM");

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    // "should authenticate when server sends 401"
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    agent.destroy();
  });
});

describe("Proxy for HTTP host without NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before(async function () {
    // Start HTTP server and proxy
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(false, undefined);
    ntlmHostConfig = {
      ntlmHosts: [httpUrl.host],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    const ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = new URL(ports.configApiUrl);
    ntlmProxyUrl = new URL(ports.ntlmProxyUrl);
  });

  after(async function () {
    // Stop HTTP server and proxy
    await coreServer.stop();
    await expressServer.stopHttpServer();
  });

  beforeEach(function () {
    // Restore timeout
    this.timeout(2000);
  });

  it("should pass through GET requests for non NTLM host", async function () {
    const res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "GET",
      "/get",
      null
    );
    assert.equal(res.status, 200);
    const resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should pass through POST requests for non NTLM host", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "POST",
      "/post",
      body
    );
    assert.equal(res.status, 200);
    const resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should pass through PUT requests for non NTLM host", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "PUT",
      "/put",
      body
    );
    assert.equal(res.status, 200);
    const resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should pass through DELETE requests for non NTLM host", async function () {
    const body = {
      ntlmHost: "https://my.test.host/",
    };
    const res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      httpUrl,
      "DELETE",
      "/delete",
      body
    );
    assert.equal(res.status, 200);
    const resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should terminate client socket on server socket error for non NTLM host", async function () {
    expressServer.closeConnectionOnNextRequest(true);
    try {
      await ProxyFacade.sendProxiedHttpRequest(
        ntlmProxyUrl,
        httpUrl,
        "GET",
        "/get",
        null
      );
      fail("Should throw on closed connection");
    } catch (err) {
      // "Client socket should be terminated"
      assert.equal((err as NodeJS.ErrnoException).message, "socket hang up");
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
  let httpUrl1: URL;
  let httpUrl2: URL;
  let ntlmHostCombinedConfig: NtlmConfig;

  before(async function () {
    // Start HTTP server and proxy
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl1 = await expressServer1.startHttpServer(true, undefined);
    httpUrl2 = await expressServer2.startHttpServer(true, undefined);
    ntlmHostConfig1 = {
      ntlmHosts: [httpUrl1.host],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    ntlmHostConfig2 = {
      ntlmHosts: [httpUrl2.host],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    ntlmHostCombinedConfig = {
      ntlmHosts: [httpUrl1.host, httpUrl2.host],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    const ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = new URL(ports.configApiUrl);
    ntlmProxyUrl = new URL(ports.ntlmProxyUrl);
  });

  after(async function () {
    // Stop HTTP server and proxy
    await coreServer.stop();
    await expressServer1.stopHttpServer();
    await expressServer2.stopHttpServer();
  });

  beforeEach(async function () {
    // Reset NTLM config
    this.timeout(2000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  describe("Multiple NtlmConfig calls", function () {
    it("should handle authentication for POST requests to two hosts", async function () {
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig1);
      assert.equal(res.status, 200);
      res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig2);
      assert.equal(res.status, 200);

      const body = {
        ntlmHost: "https://my.test.host/",
      };

      res = await ProxyFacade.sendProxiedHttpRequest(
        ntlmProxyUrl,
        httpUrl1,
        "POST",
        "/post",
        body
      );
      assert.equal(res.status, 200);
      let resBody = res.data as any;
      assert.equal(resBody.ntlmHost, body.ntlmHost);
      assert.equal(resBody.reply, "OK ÅÄÖéß");

      res = await ProxyFacade.sendProxiedHttpRequest(
        ntlmProxyUrl,
        httpUrl2,
        "POST",
        "/post",
        body
      );
      assert.equal(res.status, 200);
      resBody = res.data as any;
      assert.equal(resBody.ntlmHost, body.ntlmHost);
      assert.equal(resBody.reply, "OK ÅÄÖéß");
    });

    it("should handle authentication for POST requests to two hosts from one socket", async function () {
      let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig1);
      assert.equal(res.status, 200);
      res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig2);
      assert.equal(res.status, 200);

      const body = {
        ntlmHost: "https://my.test.host/",
      };
      const agent = ProxyFacade.getHttpProxyAgent(ntlmProxyUrl, true);

      res = await ProxyFacade.sendProxiedHttpRequest(
        ntlmProxyUrl,
        httpUrl1,
        "POST",
        "/post",
        body,
        agent
      );
      assert.equal(res.status, 200);
      let resBody = res.data as any;
      assert.equal(resBody.ntlmHost, body.ntlmHost);
      assert.equal(resBody.reply, "OK ÅÄÖéß");

      res = await ProxyFacade.sendProxiedHttpRequest(
        ntlmProxyUrl,
        httpUrl2,
        "POST",
        "/post",
        body,
        agent
      );
      assert.equal(res.status, 200);
      resBody = res.data as any;
      assert.equal(resBody.ntlmHost, body.ntlmHost);
      assert.equal(resBody.reply, "OK ÅÄÖéß");

      agent.destroy();
    });
  });

  describe("Combined NtlmConfig call", function () {
    it("should handle authentication for POST requests to two hosts", async function () {
      let res = await ProxyFacade.sendNtlmConfig(
        configApiUrl,
        ntlmHostCombinedConfig
      );
      assert.equal(res.status, 200);

      const body = {
        ntlmHost: "https://my.test.host/",
      };

      res = await ProxyFacade.sendProxiedHttpRequest(
        ntlmProxyUrl,
        httpUrl1,
        "POST",
        "/post",
        body
      );
      assert.equal(res.status, 200);
      let resBody = res.data as any;
      assert.equal(resBody.ntlmHost, body.ntlmHost);
      assert.equal(resBody.reply, "OK ÅÄÖéß");

      res = await ProxyFacade.sendProxiedHttpRequest(
        ntlmProxyUrl,
        httpUrl2,
        "POST",
        "/post",
        body
      );
      assert.equal(res.status, 200);
      resBody = res.data as any;
      assert.equal(resBody.ntlmHost, body.ntlmHost);
      assert.equal(resBody.reply, "OK ÅÄÖéß");
    });

    it("should handle authentication for POST requests to two hosts from one socket", async function () {
      let res = await ProxyFacade.sendNtlmConfig(
        configApiUrl,
        ntlmHostCombinedConfig
      );
      assert.equal(res.status, 200);

      const body = {
        ntlmHost: "https://my.test.host/",
      };
      const agent = ProxyFacade.getHttpProxyAgent(ntlmProxyUrl, true);

      res = await ProxyFacade.sendProxiedHttpRequest(
        ntlmProxyUrl,
        httpUrl1,
        "POST",
        "/post",
        body,
        agent
      );
      assert.equal(res.status, 200);
      let resBody = res.data as any;
      assert.equal(resBody.ntlmHost, body.ntlmHost);
      assert.equal(resBody.reply, "OK ÅÄÖéß");

      res = await ProxyFacade.sendProxiedHttpRequest(
        ntlmProxyUrl,
        httpUrl2,
        "POST",
        "/post",
        body,
        agent
      );
      assert.equal(res.status, 200);
      resBody = res.data as any;
      assert.equal(resBody.ntlmHost, body.ntlmHost);
      assert.equal(resBody.reply, "OK ÅÄÖéß");

      agent.destroy();
    });
  });
});
