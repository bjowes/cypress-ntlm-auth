// cSpell:ignore nisse, mptst

import { ExpressServer } from "./express.server";
import { ProxyFacade } from "./proxy.facade";

const kapAgent = require("keepalive-proxy-agent");
import { jest } from "@jest/globals";
import * as url from "url";

import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { DependencyInjection } from "../../../src/proxy/dependency.injection";
import { TYPES } from "../../../src/proxy/dependency.injection.types";
import { ICoreServer } from "../../../src/proxy/interfaces/i.core.server";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";
import { describeIfWindows } from "../conditions";

let configApiUrl: string;
let ntlmProxyUrl: string;
let httpsUrl: string;
let upstreamProxyUrl: string;
let upstreamProxyReqCount: number;

describe("Proxy for HTTPS host with NTLM and upstream proxy", function () {
  let ntlmHostConfig: NtlmConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  beforeAll(async function () {
    // Start HTTPS server and proxy
    jest.setTimeout(30000);
    upstreamProxyUrl = await proxyFacade.startMitmProxy(false, function (ctx, callback) {
      upstreamProxyReqCount++;
      return callback();
    });
    httpsUrl = await expressServer.startHttpsServer(true, undefined);
    ntlmHostConfig = {
      ntlmHosts: [httpsUrl.replace("https://", "")],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, upstreamProxyUrl, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  afterAll(async function () {
    // Stop HTTPS server and proxy
    await coreServer.stop();
    proxyFacade.stopMitmProxy();
    await expressServer.stopHttpsServer();
  });

  beforeEach(async function () {
    // Reset NTLM config
    jest.setTimeout(3000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
    upstreamProxyReqCount = 0;
  });

  it("should handle authentication for GET requests", async function () {
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status).toEqual(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, proxyFacade.mitmCaCert);
    // "should be three requests due to handshake"
    expect(upstreamProxyReqCount).toEqual(3);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.message).toEqual("Expecting larger payload on GET");
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on GET requests", async function () {
    // Cert is for upstream mitm, not for express server
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, proxyFacade.mitmCaCert);
    // "should be one requests"
    expect(upstreamProxyReqCount).toEqual(1);
    expect(res.status).toEqual(401);
  });

  it("should handle authentication for POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status).toEqual(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "POST", "/post", body, proxyFacade.mitmCaCert);
    // "should be three requests due to handshake"
    expect(upstreamProxyReqCount).toEqual(3);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).toEqual(body.ntlmHost);
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    // Cert is for upstream mitm, not for express server
    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      proxyFacade.mitmCaCert
    );
    // "should be one requests"
    expect(upstreamProxyReqCount).toEqual(1);
    expect(res.status).toEqual(401);
  });

  it("should handle authentication for PUT requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status).toEqual(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "PUT", "/put", body, proxyFacade.mitmCaCert);
    // "should be three requests due to handshake"
    expect(upstreamProxyReqCount).toEqual(3);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).toEqual(body.ntlmHost);
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on PUT requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    // Cert is for upstream mitm, not for express server
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "PUT", "/put", body, proxyFacade.mitmCaCert);
    // "should be one requests"
    expect(upstreamProxyReqCount).toEqual(1);
    expect(res.status).toEqual(401);
  });

  it("should handle authentication for DELETE requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status).toEqual(200);
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "DELETE",
      "/delete",
      body,
      proxyFacade.mitmCaCert
    );
    // "should be three requests due to handshake"
    expect(upstreamProxyReqCount).toEqual(3);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).toEqual(body.ntlmHost);
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on DELETE requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    // Cert is for upstream mitm, not for express server
    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "DELETE",
      "/delete",
      body,
      proxyFacade.mitmCaCert
    );
    // "should be one requests"
    expect(upstreamProxyReqCount).toEqual(1);
    expect(res.status).toEqual(401);
  });

  it("should forward 504 from upstream proxy on server socket error for NTLM host", async function () {
    let proxyUrl = url.parse(ntlmProxyUrl);
    let agent = new kapAgent({
      proxy: {
        hostname: proxyUrl.hostname,
        port: +proxyUrl.port,
        headers: { "User-Agent": "Node" },
      },
      ca: [proxyFacade.mitmCaCert],
    });

    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status).toEqual(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, undefined, agent);
    // "first req should return 200"
    expect(res.status).toEqual(200);

    expressServer.closeConnectionOnNextRequest(true);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, undefined, agent);
    // "Should return 504 from upstream proxy"
    expect(res.status).toEqual(504);
    agent.destroy();
  });
});

describeIfWindows("Proxy for HTTPS host with NTLM using SSO and upstream proxy", function () {
  let ntlmSsoConfig: NtlmSsoConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  beforeAll(async function () {
    // Start HTTPS server and proxy
    jest.setTimeout(15000);
    upstreamProxyUrl = await proxyFacade.startMitmProxy(false, function (ctx, callback) {
      upstreamProxyReqCount++;
      return callback();
    });
    httpsUrl = await expressServer.startHttpsServer(true, undefined);
    ntlmSsoConfig = {
      ntlmHosts: ["localhost"],
    };

    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, upstreamProxyUrl, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  afterAll(async function () {
    // Stop HTTPS server and proxy
    if (coreServer) {
      await coreServer.stop();
      proxyFacade.stopMitmProxy();
      await expressServer.stopHttpsServer();
    }
  });

  beforeEach(async function () {
    // Reset NTLM config
    jest.setTimeout(3000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
    upstreamProxyReqCount = 0;
  });

  it("should handle authentication for GET requests", async function () {
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status).toEqual(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, proxyFacade.mitmCaCert);
    // "should be three requests due to handshake"
    expect(upstreamProxyReqCount).toEqual(3);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.message).toEqual("Expecting larger payload on GET");
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on GET requests", async function () {
    // Cert is for upstream mitm, not for express server
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, proxyFacade.mitmCaCert);
    // "should be one requests"
    expect(upstreamProxyReqCount).toEqual(1);
    expect(res.status).toEqual(401);
  });

  it("should handle authentication for POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status).toEqual(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "POST", "/post", body, proxyFacade.mitmCaCert);
    // "should be three requests due to handshake"
    expect(upstreamProxyReqCount).toEqual(3);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).toEqual(body.ntlmHost);
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });
});

describe("Proxy for HTTPS host without NTLM and upstream proxy", function () {
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  beforeAll(async function () {
    // Start HTTPS server and proxy
    jest.setTimeout(15000);
    upstreamProxyUrl = await proxyFacade.startMitmProxy(false, function (ctx, callback) {
      upstreamProxyReqCount++;
      return callback();
    });
    httpsUrl = await expressServer.startHttpsServer(false, undefined);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, upstreamProxyUrl, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  afterAll(async function () {
    // Stop HTTPS server and proxy
    await coreServer.stop();
    proxyFacade.stopMitmProxy();
    await expressServer.stopHttpsServer();
  });

  beforeEach(function () {
    // Reset upstream req count
    jest.setTimeout(3000);
    upstreamProxyReqCount = 0;
  });

  it("should pass through GET requests for non NTLM host", async function () {
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, proxyFacade.mitmCaCert);
    // "should be one request"
    expect(upstreamProxyReqCount).toEqual(1);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.message).toEqual("Expecting larger payload on GET");
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should pass through POST requests for non NTLM host", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      proxyFacade.mitmCaCert
    );
    // "should be one request"
    expect(upstreamProxyReqCount).toEqual(1);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).toEqual(body.ntlmHost);
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should pass through PUT requests for non NTLM host", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "PUT", "/put", body, proxyFacade.mitmCaCert);
    // "should be one request"
    expect(upstreamProxyReqCount).toEqual(1);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).toEqual(body.ntlmHost);
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should pass through DELETE requests for non NTLM host", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "DELETE",
      "/delete",
      body,
      proxyFacade.mitmCaCert
    );
    // "should be one request"
    expect(upstreamProxyReqCount).toEqual(1);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).toEqual(body.ntlmHost);
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should forward 504 from upstream proxy on server socket error for non NTLM host", async function () {
    let proxyUrl = url.parse(ntlmProxyUrl);
    let agent = new kapAgent({
      proxy: {
        hostname: proxyUrl.hostname,
        port: +proxyUrl.port,
        headers: { "User-Agent": "Node" },
      },
      ca: [expressServer.caCert, proxyFacade.mitmCaCert],
    });

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, undefined, agent);
    // "first req should return 200"
    expect(res.status).toEqual(200);
    expressServer.closeConnectionOnNextRequest(true);

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, undefined, agent);
    // "Broken connection should return 504 from upstream proxy"
    expect(res.status).toEqual(504);
    agent.destroy();
  });

  it("should forward 504 from upstream proxy on server CONNECT error for non NTLM host", async function () {
    let proxyUrl = url.parse(ntlmProxyUrl);
    let agent = new kapAgent({
      proxy: {
        hostname: proxyUrl.hostname,
        port: +proxyUrl.port,
        headers: { "User-Agent": "Node" },
      },
      ca: [expressServer.caCert, proxyFacade.mitmCaCert],
    });

    expressServer.closeConnectionOnNextRequest(true);
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, undefined, agent);
    // "Broken connection should return 504 from upstream proxy"
    expect(res.status).toEqual(504);
    agent.destroy();
  });
});

describe("Proxy for HTTPS host without NTLM, upstream proxy + NO_PROXY", function () {
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  beforeAll(async function () {
    // Start HTTPS server
    jest.setTimeout(15000);
    upstreamProxyUrl = await proxyFacade.startMitmProxy(false, function (ctx, callback) {
      upstreamProxyReqCount++;
      return callback();
    });
    httpsUrl = await expressServer.startHttpsServer(false, undefined);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
  });

  afterEach(async function () {
    // Stop proxy
    await coreServer.stop();
  });

  afterAll(async function () {
    // Stop HTTPS server
    httpsUrl = "";
    proxyFacade.stopMitmProxy();
    await expressServer.stopHttpsServer();
  });

  beforeEach(function () {
    // Reset upstream req count
    jest.setTimeout(3000);
    upstreamProxyReqCount = 0;
  });

  it("should use upstream proxy for https host when only http upstream proxy is defined", async function () {
    let ports = await coreServer.start(upstreamProxyUrl, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, proxyFacade.mitmCaCert);
    // "should not pass through upstream proxy"
    expect(upstreamProxyReqCount).toEqual(1);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.message).toEqual("Expecting larger payload on GET");
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should not use upstream proxy with NO_PROXY localhost", async function () {
    let ports = await coreServer.start(undefined, upstreamProxyUrl, "localhost");
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, expressServer.caCert);
    // "should not pass through upstream proxy"
    expect(upstreamProxyReqCount).toEqual(0);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.message).toEqual("Expecting larger payload on GET");
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should not use upstream proxy with NO_PROXY *host", async function () {
    let ports = await coreServer.start(undefined, upstreamProxyUrl, "*host");
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, expressServer.caCert);
    // "should not pass through upstream proxy"
    expect(upstreamProxyReqCount).toEqual(0);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.message).toEqual("Expecting larger payload on GET");
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should not use upstream proxy with NO_PROXY local*", async function () {
    let ports = await coreServer.start(undefined, upstreamProxyUrl, "local*");
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, expressServer.caCert);
    // "should not pass through upstream proxy"
    expect(upstreamProxyReqCount).toEqual(0);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.message).toEqual("Expecting larger payload on GET");
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should not use upstream proxy with NO_PROXY *", async function () {
    let ports = await coreServer.start(undefined, upstreamProxyUrl, "*");
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, expressServer.caCert);
    // "should not pass through upstream proxy"
    expect(upstreamProxyReqCount).toEqual(0);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.message).toEqual("Expecting larger payload on GET");
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });

  it("should use upstream proxy with NO_PROXY google.com", async function () {
    let ports = await coreServer.start(undefined, upstreamProxyUrl, "google.com");
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, proxyFacade.mitmCaCert);
    // "should pass through upstream proxy"
    expect(upstreamProxyReqCount).toEqual(1);
    expect(res.status).toEqual(200);
    let resBody = res.data as any;
    expect(resBody.message).toEqual("Expecting larger payload on GET");
    expect(resBody.reply).toEqual("OK ÅÄÖéß");
  });
});
