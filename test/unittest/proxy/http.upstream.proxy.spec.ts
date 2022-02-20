// cSpell:ignore nisse, mptst

import { ExpressServer } from "./express.server";
import { ProxyFacade } from "./proxy.facade";
import assert from "assert";

import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { DependencyInjection } from "../../../src/proxy/dependency.injection";
import { ICoreServer } from "../../../src/proxy/interfaces/i.core.server";
import { TYPES } from "../../../src/proxy/dependency.injection.types";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";
import { describeIfWindows } from "../conditions";

let configApiUrl: string;
let ntlmProxyUrl: string;
let httpUrl: string;
let upstreamProxyUrl: string;
let upstreamProxyReqCount: number;

describe("Proxy for HTTP host with NTLM and upstream proxy", function () {
  let ntlmHostConfig: NtlmConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before(async function () {
    // Start HTTP server and proxy
    this.timeout(15000);
    upstreamProxyUrl = await proxyFacade.startMitmProxy(false, function (ctx, callback) {
      upstreamProxyReqCount++;
      return callback();
    });
    httpUrl = await expressServer.startHttpServer(true, undefined);
    ntlmHostConfig = {
      ntlmHosts: [httpUrl.replace("http://", "")],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(upstreamProxyUrl, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after(async function () {
    // Stop HTTP server and proxy
    await coreServer.stop();
    proxyFacade.stopMitmProxy();
    await expressServer.stopHttpServer();
  });

  beforeEach(async function () {
    // Reset NTLM config
    this.timeout(2000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
    upstreamProxyReqCount = 0;
  });

  it("should handle authentication for GET requests", async function () {
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    // "should be three requests due to handshake"
    assert.equal(upstreamProxyReqCount, 3);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on GET requests", async function () {
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    // "should be one requests"
    assert.equal(upstreamProxyReqCount, 1);
    assert.equal(res.status, 401);
  });

  it("should handle authentication for POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body);
    // "should be three requests due to handshake"
    assert.equal(upstreamProxyReqCount, 3);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body);
    // "should be one requests"
    assert.equal(upstreamProxyReqCount, 1);
    assert.equal(res.status, 401);
  });

  it("should handle authentication for PUT requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "PUT", "/put", body);
    // "should be three requests due to handshake"
    assert.equal(upstreamProxyReqCount, 3);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on PUT requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "PUT", "/put", body);
    // "should be one requests"
    assert.equal(upstreamProxyReqCount, 1);
    assert.equal(res.status, 401);
  });

  it("should handle authentication for DELETE requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "DELETE", "/delete", body);
    // "should be three requests due to handshake"
    assert.equal(upstreamProxyReqCount, 3);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on DELETE requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "DELETE", "/delete", body);
    // "should be one requests"
    assert.equal(upstreamProxyReqCount, 1);
    assert.equal(res.status, 401);
  });

  it("should forward 504 from upstream proxy on server socket error for NTLM host", async function () {
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    expressServer.closeConnectionOnNextRequest(true);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    // "Should receive 504 from upstream proxy"
    assert.equal(res.status, 504);
  });
});

describeIfWindows("Proxy for HTTP host with NTLM using SSO and upstream proxy", function () {
  let ntlmSsoConfig: NtlmSsoConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before(async function () {
    // Start HTTP server and proxy
    this.timeout(15000);
    upstreamProxyUrl = await proxyFacade.startMitmProxy(false, function (ctx, callback) {
      upstreamProxyReqCount++;
      return callback();
    });
    httpUrl = await expressServer.startHttpServer(true, undefined);
    ntlmSsoConfig = {
      ntlmHosts: ["localhost"],
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(upstreamProxyUrl, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after(async function () {
    // Stop HTTP server and proxy
    if (coreServer) {
      await coreServer.stop();
      proxyFacade.stopMitmProxy();
      await expressServer.stopHttpServer();
    }
  });

  beforeEach(async function () {
    // Reset NTLM config
    this.timeout(2000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
    upstreamProxyReqCount = 0;
  });

  it("should handle authentication for GET requests", async function () {
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    // "should be three requests due to handshake"
    assert.equal(upstreamProxyReqCount, 3);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on GET requests", async function () {
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    // "should be one requests"
    assert.equal(upstreamProxyReqCount, 1);
    assert.equal(res.status, 401);
  });

  it("should handle authentication for POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body);
    // "should be three requests due to handshake"
    assert.equal(upstreamProxyReqCount, 3);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });
});

describe("Proxy for HTTP host without NTLM and upstream proxy", function () {
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before(async function () {
    // Start HTTP server and proxy
    this.timeout(15000);
    upstreamProxyUrl = await proxyFacade.startMitmProxy(false, function (ctx, callback) {
      upstreamProxyReqCount++;
      return callback();
    });
    httpUrl = await expressServer.startHttpServer(false, undefined);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(upstreamProxyUrl, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after(async function () {
    // Stop HTTP server and proxy
    await coreServer.stop();
    proxyFacade.stopMitmProxy();
    await expressServer.stopHttpServer();
  });

  beforeEach(function () {
    // Reset upstream req count
    this.timeout(2000);
    upstreamProxyReqCount = 0;
  });

  it("should pass through GET requests for non NTLM host", async function () {
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    // "should be one request"
    assert.equal(upstreamProxyReqCount, 1);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should pass through POST requests for non NTLM host", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body);
    // "should be one request"
    assert.equal(upstreamProxyReqCount, 1);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should pass through PUT requests for non NTLM host", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "PUT", "/put", body);
    // "should be one request"
    assert.equal(upstreamProxyReqCount, 1);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should pass through DELETE requests for non NTLM host", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "DELETE", "/delete", body);
    // "should be one request"
    assert.equal(upstreamProxyReqCount, 1);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should forward 504 from upstream proxy on server socket error for non NTLM host", async function () {
    expressServer.closeConnectionOnNextRequest(true);
    const res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    // "Should receive 504 from upstream proxy"
    assert.equal(res.status, 504);
  });
});

describe("Proxy for HTTP host without NTLM, upstream proxy + NO_PROXY", function () {
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before(async function () {
    // Start HTTP server
    this.timeout(15000);
    upstreamProxyUrl = await proxyFacade.startMitmProxy(false, function (ctx, callback) {
      upstreamProxyReqCount++;
      return callback();
    });
    httpUrl = await expressServer.startHttpServer(false, undefined);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
  });

  afterEach(async function () {
    // Stop proxy
    await coreServer.stop();
  });

  after(async function () {
    // Stop HTTP server
    httpUrl = "";
    proxyFacade.stopMitmProxy();
    await expressServer.stopHttpServer();
  });

  beforeEach(function () {
    // Reset upstream req count
    this.timeout(2000);
    upstreamProxyReqCount = 0;
  });

  it("should not use upstream proxy for http host when only https upstream proxy is defined", async function () {
    let ports = await coreServer.start(undefined, upstreamProxyUrl, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    // "should not pass through upstream proxy"
    assert.equal(upstreamProxyReqCount, 0);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should not use upstream proxy with NO_PROXY localhost", async function () {
    let ports = await coreServer.start(upstreamProxyUrl, undefined, "localhost");
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    // "should not pass through upstream proxy"
    assert.equal(upstreamProxyReqCount, 0);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should not use upstream proxy with NO_PROXY *host", async function () {
    let ports = await coreServer.start(upstreamProxyUrl, undefined, "*host");
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    // "should not pass through upstream proxy"
    assert.equal(upstreamProxyReqCount, 0);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should not use upstream proxy with NO_PROXY local*", async function () {
    let ports = await coreServer.start(upstreamProxyUrl, undefined, "local*");
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    // "should not pass through upstream proxy"
    assert.equal(upstreamProxyReqCount, 0);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should not use upstream proxy with NO_PROXY *", async function () {
    let ports = await coreServer.start(upstreamProxyUrl, undefined, "*");
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    // "should not pass through upstream proxy"
    assert.equal(upstreamProxyReqCount, 0);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should use upstream proxy with NO_PROXY google.com", async function () {
    let ports = await coreServer.start(upstreamProxyUrl, undefined, "google.com");
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null);
    // "should pass through upstream proxy"
    assert.equal(upstreamProxyReqCount, 1);
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });
});
