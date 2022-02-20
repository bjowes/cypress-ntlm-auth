// cSpell:ignore nisse, mptst

import { ExpressServer } from "./express.server";
import { ProxyFacade } from "./proxy.facade";
import * as http from "http";
import assert from "assert";

import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { ICoreServer } from "../../../src/proxy/interfaces/i.core.server";
import { DependencyInjection } from "../../../src/proxy/dependency.injection";
import { TYPES } from "../../../src/proxy/dependency.injection.types";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";
import { describeIfWindows } from "../conditions";
import { httpsTunnel, TunnelAgent } from "../../../src/proxy/tunnel.agent";
import { URLExt } from "../../../src/util/url.ext";

let configApiUrl: string;
let ntlmProxyUrl: string;
let httpsUrl: string;

describe("Proxy for HTTPS host with NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer | undefined;
  let dependencyInjection = new DependencyInjection();

  before(async function () {
    // Start HTTPS server and proxy
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl = await expressServer.startHttpsServer(true, undefined);
    ntlmHostConfig = {
      ntlmHosts: [httpsUrl.replace("https://", "")],
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

  after(async function () {
    // Stop HTTPS server and proxy
    await coreServer?.stop();
    await expressServer.stopHttpsServer();
  });

  beforeEach(async function () {
    // Reset NTLM config
    if (!coreServer) {
      this.timeout(30000);
      coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
      let ports = await coreServer.start(undefined, undefined, undefined);
      configApiUrl = ports.configApiUrl;
      ntlmProxyUrl = ports.ntlmProxyUrl;
    } else {
      await ProxyFacade.sendNtlmReset(configApiUrl);
    }
    this.timeout(2000);
  });

  it("should handle authentication for GET requests", async function () {
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "GET",
      "/get",
      null,
      proxyFacade.mitmCaCert
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on GET requests", async function () {
    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "GET",
      "/get",
      null,
      expressServer.caCert
    );
    assert.equal(res.status, 401);
  });

  it("should handle authentication for POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      proxyFacade.mitmCaCert
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      expressServer.caCert
    );
    assert.equal(res.status, 401);
  });

  it("should handle authentication for PUT requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "PUT",
      "/put",
      body,
      proxyFacade.mitmCaCert
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on PUT requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "PUT",
      "/put",
      body,
      expressServer.caCert
    );
    assert.equal(res.status, 401);
  });

  it("should handle authentication for DELETE requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "DELETE",
      "/delete",
      body,
      proxyFacade.mitmCaCert
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on DELETE requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "DELETE",
      "/delete",
      body,
      expressServer.caCert
    );
    assert.equal(res.status, 401);
  });

  it("should close SSL tunnels on quit", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let proxyUrl = new URL(ntlmProxyUrl);

    let agent1 = httpsTunnel({
      proxy: {
        host: proxyUrl.hostname,
        port: URLExt.portOrDefault(proxyUrl),
        headers: { "User-Agent": "Node" },
      },
      keepAlive: true,
      ca: [expressServer.caCert, proxyFacade.mitmCaCert],
    });

    let agent2 = httpsTunnel({
      proxy: {
        host: proxyUrl.hostname,
        port: URLExt.portOrDefault(proxyUrl),
        headers: { "User-Agent": "Node" },
      },
      keepAlive: true,
      ca: [expressServer.caCert, proxyFacade.mitmCaCert],
    });

    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      undefined,
      agent1
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      undefined,
      agent2
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");

    agent1.destroy();

    const agentSocketClosed = waitForAgentSocketClose(agent2);
    await ProxyFacade.sendQuitCommand(configApiUrl, true);
    coreServer = undefined; // Reinitialize core server after quit
    await agentSocketClosed;
  });

  it("should re-authenticate after reconfiguration when required by server", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let proxyUrl = new URL(ntlmProxyUrl);
    let agent = httpsTunnel({
      proxy: {
        host: proxyUrl.hostname,
        port: URLExt.portOrDefault(proxyUrl),
        headers: { "User-Agent": "Node" },
      },
      keepAlive: true,
      ca: [expressServer.caCert, proxyFacade.mitmCaCert],
    });
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      undefined,
      agent
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
    assert.equal(expressServer.lastRequestContainedAuthHeader(), true);

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      undefined,
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

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      undefined,
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

  it("should terminate client socket on server socket error for NTLM host", async function () {
    let proxyUrl = new URL(ntlmProxyUrl);
    let agent = httpsTunnel({
      proxy: {
        host: proxyUrl.hostname,
        port: URLExt.portOrDefault(proxyUrl),
        headers: { "User-Agent": "Node" },
      },
      keepAlive: true,
      ca: [expressServer.caCert, proxyFacade.mitmCaCert],
    });

    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "GET",
      "/get",
      null,
      undefined,
      agent
    );
    // "first req should return 200"
    assert.equal(res.status, 200);
    expressServer.closeConnectionOnNextRequest(true);
    try {
      await ProxyFacade.sendRemoteRequest(
        ntlmProxyUrl,
        httpsUrl,
        "GET",
        "/get",
        null,
        undefined,
        agent
      );
      throw new Error("Should throw on closed connection");
    } catch (err) {
      // "Client socket should be terminated"
      assert.equal((err as NodeJS.ErrnoException).message, "socket hang up");
    } finally {
      agent.destroy();
    }
  });
});

describeIfWindows("Proxy for HTTPS host with NTLM using SSO", function () {
  let ntlmSsoConfig: NtlmSsoConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before(async function () {
    // Start HTTPS server and proxy
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl = await expressServer.startHttpsServer(true, undefined);

    ntlmSsoConfig = {
      ntlmHosts: ["localhost"],
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after(async function () {
    // Stop HTTPS server and proxy
    if (coreServer) {
      await coreServer.stop();
      await expressServer.stopHttpsServer();
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
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "GET",
      "/get",
      null,
      proxyFacade.mitmCaCert
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should return 401 for unconfigured host on GET requests", async function () {
    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "GET",
      "/get",
      null,
      expressServer.caCert
    );
    assert.equal(res.status, 401);
  });

  it("should handle authentication for POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      proxyFacade.mitmCaCert
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });
});

describe("Proxy for HTTPS host without NTLM", function () {
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer | undefined = undefined;
  let dependencyInjection = new DependencyInjection();

  before(async function () {
    // Start HTTPS server and proxy
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl = await expressServer.startHttpsServer(false, undefined);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  beforeEach(async function () {
    // Restore timeout
    if (!coreServer) {
      this.timeout(30000);
      coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
      let ports = await coreServer.start(undefined, undefined, undefined);
      configApiUrl = ports.configApiUrl;
      ntlmProxyUrl = ports.ntlmProxyUrl;
    }
    this.timeout(2000);
  });

  after(async function () {
    // Stop HTTPS server and proxy
    await coreServer?.stop();
    await expressServer.stopHttpsServer();
  });

  it("should pass through GET requests for non NTLM host", async function () {
    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "GET",
      "/get",
      null,
      expressServer.caCert
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.message, "Expecting larger payload on GET");
    assert.equal(resBody.reply, "OK ÅÄÖéß");
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
      expressServer.caCert
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should pass through PUT requests for non NTLM host", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "PUT",
      "/put",
      body,
      expressServer.caCert
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
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
      expressServer.caCert
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");
  });

  it("should close SSL tunnels on reset", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let proxyUrl = new URL(ntlmProxyUrl);

    let agent1 = httpsTunnel({
      proxy: {
        host: proxyUrl.hostname,
        port: URLExt.portOrDefault(proxyUrl),
        headers: { "User-Agent": "Node" },
      },
      keepAlive: true,
      ca: [expressServer.caCert],
    });

    let agent2 = httpsTunnel({
      proxy: {
        host: proxyUrl.hostname,
        port: URLExt.portOrDefault(proxyUrl),
        headers: { "User-Agent": "Node" },
      },
      keepAlive: true,
      ca: [expressServer.caCert],
    });

    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      expressServer.caCert,
      agent1
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      expressServer.caCert,
      agent2
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");

    agent1.destroy();

    const agentSocketClosed = waitForAgentSocketClose(agent2);
    await ProxyFacade.sendNtlmReset(configApiUrl);
    await agentSocketClosed;
  });

  it("should close SSL tunnels on quit", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let proxyUrl = new URL(ntlmProxyUrl);

    let agent1 = httpsTunnel({
      proxy: {
        host: proxyUrl.hostname,
        port: URLExt.portOrDefault(proxyUrl),
        headers: { "User-Agent": "Node" },
      },
      keepAlive: true,
      ca: [expressServer.caCert],
    });

    let agent2 = httpsTunnel({
      proxy: {
        host: proxyUrl.hostname,
        port: URLExt.portOrDefault(proxyUrl),
        headers: { "User-Agent": "Node" },
      },
      keepAlive: true,
      ca: [expressServer.caCert],
    });

    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      expressServer.caCert,
      agent1
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      expressServer.caCert,
      agent2
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");

    agent1.destroy();

    const agentSocketClosed = waitForAgentSocketClose(agent2);
    await ProxyFacade.sendQuitCommand(configApiUrl, true);
    coreServer = undefined; // Restore coreServer after quit
    await agentSocketClosed;
  });

  it("should terminate client socket on server socket error for non NTLM host", async function () {
    let proxyUrl = new URL(ntlmProxyUrl);
    let agent = httpsTunnel({
      proxy: {
        host: proxyUrl.hostname,
        port: URLExt.portOrDefault(proxyUrl),
        headers: { "User-Agent": "Node" },
      },
      keepAlive: true,
      ca: [expressServer.caCert],
    });

    let res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "GET",
      "/get",
      null,
      undefined,
      agent
    );
    // "first req should return 200"
    assert.equal(res.status, 200);
    expressServer.closeConnectionOnNextRequest(true);
    try {
      await ProxyFacade.sendRemoteRequest(
        ntlmProxyUrl,
        httpsUrl,
        "GET",
        "/get",
        null,
        undefined,
        agent
      );
      throw new Error("Should throw on closed connection");
    } catch (err) {
      // "Client socket should be terminated"
      assert.equal((err as NodeJS.ErrnoException).message, "socket hang up");
    } finally {
      agent.destroy();
    }
  });

  it("should terminate client socket on server CONNECT error for non NTLM host", async function () {
    let proxyUrl = new URL(ntlmProxyUrl);
    let agent = httpsTunnel({
      proxy: {
        host: proxyUrl.hostname,
        port: URLExt.portOrDefault(proxyUrl),
        headers: { "User-Agent": "Node" },
      },
      keepAlive: true,
      ca: [expressServer.caCert],
    });

    expressServer.closeConnectionOnNextRequest(true);
    try {
      await ProxyFacade.sendRemoteRequest(
        ntlmProxyUrl,
        httpsUrl,
        "GET",
        "/get",
        null,
        undefined,
        agent
      );
      throw new Error("Should throw on closed connection");
    } catch (err) {
      // "Client socket should be terminated"
      assert.equal((err as NodeJS.ErrnoException).message, "socket hang up");
    } finally {
      agent.destroy();
    }
  });
});

function waitForAgentSocketClose(agent: TunnelAgent): Promise<number> {
  function rejectDelay(reason: number) {
    return new Promise<number>(function (resolve, reject) {
      setTimeout(reject.bind(null, reason), 50);
    });
  }

  function attempt() {
    return agent.socketCount();
  }

  function test(val: number) {
    if (val > 0) {
      throw val;
    } else {
      return val;
    }
  }

  var p: Promise<number> = Promise.reject();
  for (var i = 0; i < 20; i++) {
    p = p.catch(attempt).then(test).catch(rejectDelay);
  }
  return p;
}

describe("Proxy for multiple HTTPS hosts with NTLM", function () {
  let ntlmHostConfig1: NtlmConfig;
  let ntlmHostConfig2: NtlmConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer1 = new ExpressServer();
  let expressServer2 = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();
  let httpsUrl1: string;
  let httpsUrl2: string;

  before(async function () {
    // Start HTTP server and proxy
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl1 = await expressServer1.startHttpsServer(true, undefined);
    httpsUrl2 = await expressServer2.startHttpsServer(true, undefined);
    ntlmHostConfig1 = {
      ntlmHosts: [httpsUrl1.replace("https://", "")],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    ntlmHostConfig2 = {
      ntlmHosts: [httpsUrl2.replace("https://", "")],
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

  after(async function () {
    // Stop HTTP server and proxy
    await coreServer.stop();
    await expressServer1.stopHttpsServer();
    await expressServer2.stopHttpsServer();
  });

  beforeEach(async function () {
    // Reset NTLM config
    this.timeout(2000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it("should handle authentication for POST requests to two hosts", async function () {
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig1);
    assert.equal(res.status, 200);
    res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig2);
    assert.equal(res.status, 200);

    let body = {
      ntlmHost: "https://my.test.host/",
    };

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl1,
      "POST",
      "/post",
      body,
      proxyFacade.mitmCaCert
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl2,
      "POST",
      "/post",
      body,
      proxyFacade.mitmCaCert
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

    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let proxyUrl = new URL(ntlmProxyUrl);

    let agent = httpsTunnel({
      proxy: {
        host: proxyUrl.hostname,
        port: URLExt.portOrDefault(proxyUrl),
        headers: { "User-Agent": "Node" },
      },
      keepAlive: true,
      ca: [
        expressServer1.caCert,
        expressServer2.caCert,
        proxyFacade.mitmCaCert,
      ],
    });

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl1,
      "POST",
      "/post",
      body,
      undefined,
      agent
    );
    assert.equal(res.status, 200);
    let resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl2,
      "POST",
      "/post",
      body,
      undefined,
      agent
    );
    assert.equal(res.status, 200);
    resBody = res.data as any;
    assert.equal(resBody.ntlmHost, body.ntlmHost);
    assert.equal(resBody.reply, "OK ÅÄÖéß");

    agent.destroy();
  });
});
