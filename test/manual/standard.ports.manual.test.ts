// cSpell:ignore nisse, mptst

// This test binds to the default HTTP and HTTPS ports (80 and 443),
// which requires admin priveliges on many platforms. Hence it must
// be run manually. On OS X, you can use (from the project root)
// sudo node_modules/.bin/mocha --require ./test/ts.hooks.js --require source-map-support/register test/manual/standard.ports.manual.test.ts

import { ProxyFacade } from "../unittest/proxy/proxy.facade";
import { DependencyInjection } from "../../src/proxy/dependency.injection";
import { TYPES } from "../../src/proxy/dependency.injection.types";
import { ExpressServer } from "../unittest/proxy/express.server";
import { ICoreServer } from "../../src/proxy/interfaces/i.core.server";
import { NtlmConfig } from "../../src/models/ntlm.config.model";
import { jest } from "@jest/globals";

let configApiUrl: string;
let ntlmProxyUrl: string;

describe("Proxy for HTTP host on port 80 with NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let dependencyInjection = new DependencyInjection();
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let httpUrl: string;

  beforeAll(async function () {
    // Start HTTP server and proxy
    jest.setTimeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(false, 80);
    ntlmHostConfig = {
      ntlmHosts: [httpUrl],
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

  afterAll(async function () {
    // Stop HTTP server and proxy
    await coreServer.stop();
    await expressServer.stopHttpServer();
  });

  beforeEach(async function () {
    // Reset NTLM config
    jest.setTimeout(5000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
    ntlmHostConfig.ntlmHosts = [httpUrl];
  });

  it("should handle authentication for GET requests when config includes port", async function () {
    ntlmHostConfig.ntlmHosts = ["http://localhost:80"];
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status).toEqual(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should handle authentication for GET requests when config excludes port", async function () {
    ntlmHostConfig.ntlmHosts = ["http://localhost"];
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status).toEqual(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });
});

describe("Proxy for HTTPS host on port 443 with NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let dependencyInjection = new DependencyInjection();
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let httpsUrl: string;

  beforeAll(async function () {
    // Start HTTPS server and proxy
    jest.setTimeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl = await expressServer.startHttpsServer(false, 443);
    ntlmHostConfig = {
      ntlmHosts: [httpsUrl],
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

  afterAll(async function () {
    // Stop HTTPS server and proxy
    coreServer.stop();
    await expressServer.stopHttpsServer();
  });

  beforeEach(async function () {
    // Reset NTLM config
    jest.setTimeout(5000);
    ProxyFacade.sendNtlmReset(configApiUrl);
    ntlmHostConfig.ntlmHosts = [httpsUrl];
  });

  it("should handle authentication for GET requests when config includes port", async function () {
    ntlmHostConfig.ntlmHosts = ["https://localhost:443"];
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status).toEqual(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, proxyFacade.mitmCaCert);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should handle authentication for GET requests when config excludes port", async function () {
    ntlmHostConfig.ntlmHosts = ["https://localhost"];
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status).toEqual(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, proxyFacade.mitmCaCert);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });
});
