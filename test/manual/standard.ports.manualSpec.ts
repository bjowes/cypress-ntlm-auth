// cSpell:ignore nisse, mptst

// This test binds to the default HTTP and HTTPS ports (80 and 443),
// which requires admin privileges on many platforms. Hence it must
// be run manually. On OS X, you can use (from the project root)
// sudo node_modules/.bin/mocha test/manual/standard.ports.manual.test.ts

import { ProxyFacade } from "../unittest/proxy/proxy.facade";
import { DependencyInjection } from "../../src/proxy/dependency.injection";
import { TYPES } from "../../src/proxy/dependency.injection.types";
import { ExpressServer } from "../unittest/proxy/express.server";
import { ICoreServer } from "../../src/proxy/interfaces/i.core.server";
import { NtlmConfig } from "../../src/models/ntlm.config.model";
import assert from "assert";

let configApiUrl: URL;
let ntlmProxyUrl: URL;

describe("Proxy for HTTP host on port 80 with NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let dependencyInjection = new DependencyInjection();
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let httpUrl: URL;

  before(async function () {
    // Start HTTP server and proxy
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(false, 80);
    ntlmHostConfig = {
      ntlmHosts: [httpUrl.host],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
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
    this.timeout(5000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
    ntlmHostConfig.ntlmHosts = [httpUrl.host];
  });

  it("should handle authentication for GET requests when config includes port", async function () {
    ntlmHostConfig.ntlmHosts = [httpUrl.hostname + ":80"];
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
    let resBody = res.data as any;
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should handle authentication for GET requests when config excludes port", async function () {
    ntlmHostConfig.ntlmHosts = [httpUrl.hostname];
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
    let resBody = res.data as any;
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });
});

describe("Proxy for HTTPS host on port 443 with NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let dependencyInjection = new DependencyInjection();
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let httpsUrl: URL;

  before(async function () {
    // Start HTTPS server and proxy
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl = await expressServer.startHttpsServer(false, 443);
    ntlmHostConfig = {
      ntlmHosts: [httpsUrl.host],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = new URL(ports.configApiUrl);
    ntlmProxyUrl = new URL(ports.ntlmProxyUrl);
  });

  after(async function () {
    // Stop HTTPS server and proxy
    coreServer.stop();
    await expressServer.stopHttpsServer();
  });

  beforeEach(async function () {
    // Reset NTLM config
    this.timeout(5000);
    ProxyFacade.sendNtlmReset(configApiUrl);
    ntlmHostConfig.ntlmHosts = [httpsUrl.host];
  });

  it("should handle authentication for GET requests when config includes port", async function () {
    ntlmHostConfig.ntlmHosts = [httpsUrl.hostname + ":443"];
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendProxiedHttpsRequest(
      ntlmProxyUrl,
      httpsUrl,
      "GET",
      "/get",
      null,
      [proxyFacade.mitmCaCert]
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should handle authentication for GET requests when config excludes port", async function () {
    ntlmHostConfig.ntlmHosts = [httpsUrl.hostname];
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendProxiedHttpsRequest(
      ntlmProxyUrl,
      httpsUrl,
      "GET",
      "/get",
      null,
      [proxyFacade.mitmCaCert]
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });
});
