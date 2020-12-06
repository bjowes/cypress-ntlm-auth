// cSpell:ignore nisse, mptst
import "mocha";

import { ExpressServer } from "./express.server";
import { ProxyFacade } from "./proxy.facade";
import http from "http";

import chaiAsPromised from "chai-as-promised";
import chai from "chai";
const expect = chai.expect;
chai.use(chaiAsPromised);

import url from "url";
const kapAgent = require("keepalive-proxy-agent");

import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { ICoreServer } from "../../../src/proxy/interfaces/i.core.server";
import { DependencyInjection } from "../../../src/proxy/dependency.injection";
import { TYPES } from "../../../src/proxy/dependency.injection.types";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";
import { osSupported } from "win-sso";

let configApiUrl: string;
let ntlmProxyUrl: string;
let httpsUrl: string;

describe("Proxy for HTTPS host with NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before("Start HTTPS server and proxy", async function () {
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

  after("Stop HTTPS server and proxy", async function () {
    await coreServer.stop();
    await expressServer.stopHttpsServer();
  });

  beforeEach("Reset NTLM config", async function () {
    this.timeout(2000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it("should handle authentication for GET requests", async function () {
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "GET",
      "/get",
      null,
      proxyFacade.mitmCaCert
    );
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal("Expecting larger payload on GET");
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
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
    expect(res.status, "remote request should return 401").to.be.equal(401);
  });

  it("should handle authentication for POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      proxyFacade.mitmCaCert
    );
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
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
    expect(res.status, "remote request should return 401").to.be.equal(401);
  });

  it("should handle authentication for PUT requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "PUT",
      "/put",
      body,
      proxyFacade.mitmCaCert
    );
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
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
    expect(res.status, "remote request should return 401").to.be.equal(401);
  });

  it("should handle authentication for DELETE requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "DELETE",
      "/delete",
      body,
      proxyFacade.mitmCaCert
    );
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
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
    expect(res.status, "remote request should return 401").to.be.equal(401);
  });

  // This test will requires an adapted version of http-mitm-proxy, to be implemented later
  xit("should close SSL tunnels on quit", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let proxyUrl = url.parse(ntlmProxyUrl);

    let agent1 = new kapAgent({
      proxy: {
        hostname: proxyUrl.hostname,
        port: +proxyUrl.port,
        headers: { "User-Agent": "Node" },
      },
      ca: [expressServer.caCert, proxyFacade.mitmCaCert],
    });

    let agent2 = new kapAgent({
      proxy: {
        hostname: proxyUrl.hostname,
        port: +proxyUrl.port,
        headers: { "User-Agent": "Node" },
      },
      ca: [expressServer.caCert, proxyFacade.mitmCaCert],
    });

    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      undefined,
      agent1
    );
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      undefined,
      agent2
    );
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

    agent1.destroy();

    await ProxyFacade.sendQuitCommand(configApiUrl, true);
    await waitForAgentSocketClose(agent2);
  });

  it("should re-authentication after reconfiguration when required by server", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let proxyUrl = url.parse(ntlmProxyUrl);
    let agent = new kapAgent({
      proxy: {
        hostname: proxyUrl.hostname,
        port: +proxyUrl.port,
        headers: { "User-Agent": "Node" },
      },
      ca: [expressServer.caCert, proxyFacade.mitmCaCert],
    });
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      undefined,
      agent
    );
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should authenticate on first request"
    ).to.be.true;

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      undefined,
      agent
    );
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

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      undefined,
      agent
    );
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
    expect(
      expressServer.lastRequestContainedAuthHeader(),
      "should authenticate when server sends 401"
    ).to.be.true;

    agent.destroy();
  });
});

describe("Proxy for HTTPS host with NTLM using SSO", function () {
  let ntlmSsoConfig: NtlmSsoConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before("Start HTTPS server and proxy", async function () {
    // Check SSO support
    if (osSupported() === false) {
      this.skip();
      return;
    }

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

  after("Stop HTTPS server and proxy", async function () {
    if (coreServer) {
      await coreServer.stop();
      await expressServer.stopHttpsServer();
    }
  });

  beforeEach("Reset NTLM config", async function () {
    this.timeout(2000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it("should handle authentication for GET requests", async function () {
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status, "ntlm-sso-config should return 200").to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "GET",
      "/get",
      null,
      proxyFacade.mitmCaCert
    );
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal("Expecting larger payload on GET");
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
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
    expect(res.status, "remote request should return 401").to.be.equal(401);
  });

  it("should handle authentication for POST requests", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status, "ntlm-sso-config should return 200").to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      proxyFacade.mitmCaCert
    );
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
  });
});

describe("Proxy for HTTPS host without NTLM", function () {
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before("Start HTTPS server and proxy", async function () {
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl = await expressServer.startHttpsServer(false, undefined);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  beforeEach("Restore timeout", function () {
    this.timeout(2000);
  });

  after("Stop HTTPS server and proxy", async function () {
    await coreServer.stop();
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
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal("Expecting larger payload on GET");
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
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
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
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
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
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
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
  });

  it("should close SSL tunnels on reset", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let proxyUrl = url.parse(ntlmProxyUrl);

    let agent1 = new kapAgent({
      proxy: {
        hostname: proxyUrl.hostname,
        port: +proxyUrl.port,
        headers: { "User-Agent": "Node" },
      },
      ca: [expressServer.caCert],
    });

    let agent2 = new kapAgent({
      proxy: {
        hostname: proxyUrl.hostname,
        port: +proxyUrl.port,
        headers: { "User-Agent": "Node" },
      },
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
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      expressServer.caCert,
      agent2
    );
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

    agent1.destroy();

    await ProxyFacade.sendNtlmReset(configApiUrl);
    await waitForAgentSocketClose(agent2);
  });

  it("should close SSL tunnels on quit", async function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };
    let proxyUrl = url.parse(ntlmProxyUrl);

    let agent1 = new kapAgent({
      proxy: {
        hostname: proxyUrl.hostname,
        port: +proxyUrl.port,
        headers: { "User-Agent": "Node" },
      },
      ca: [expressServer.caCert],
    });

    let agent2 = new kapAgent({
      proxy: {
        hostname: proxyUrl.hostname,
        port: +proxyUrl.port,
        headers: { "User-Agent": "Node" },
      },
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
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl,
      "POST",
      "/post",
      body,
      expressServer.caCert,
      agent2
    );
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

    agent1.destroy();

    await ProxyFacade.sendQuitCommand(configApiUrl, true);
    await waitForAgentSocketClose(agent2);
  });
});

function waitForAgentSocketClose(agent: http.Agent): Promise<void> {
  return new Promise((resolve, reject) => {
    let socketCount = 0;
    let socketProperty;
    let sockets = agent.sockets as any;
    let freeSockets = (agent as any)["freeSockets"] as any;

    for (let s in sockets) {
      if (sockets.hasOwnProperty(s)) {
        socketCount += sockets[s].length;
        socketProperty = sockets[s];
      }
    }
    for (let s in freeSockets) {
      if (freeSockets.hasOwnProperty(s)) {
        socketCount += freeSockets[s].length;
        socketProperty = freeSockets[s];
      }
    }

    if (socketCount > 1) {
      return reject(new Error("too many sockets"));
    }
    if (socketCount < 1) {
      return reject(new Error("no sockets"));
    }
    socketProperty[0].on("close", () => {
      return resolve();
    });
  });
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

  before("Start HTTP server and proxy", async function () {
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

  after("Stop HTTP server and proxy", async function () {
    await coreServer.stop();
    await expressServer1.stopHttpsServer();
    await expressServer2.stopHttpsServer();
  });

  beforeEach("Reset NTLM config", async function () {
    this.timeout(2000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it("should handle authentication for POST requests to two hosts", async function () {
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig1);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);
    res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig2);
    expect(res.status, "ntlm-config should return 200").to.be.equal(200);

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
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl2,
      "POST",
      "/post",
      body,
      proxyFacade.mitmCaCert
    );
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
    let proxyUrl = url.parse(ntlmProxyUrl);

    let agent = new kapAgent({
      proxy: {
        hostname: proxyUrl.hostname,
        port: +proxyUrl.port,
        headers: { "User-Agent": "Node" },
      },
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
    expect(res.status, "remote request should return 200").to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

    res = await ProxyFacade.sendRemoteRequest(
      ntlmProxyUrl,
      httpsUrl2,
      "POST",
      "/post",
      body,
      undefined,
      agent
    );
    expect(res.status, "remote request should return 200").to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal("OK ÅÄÖéß");

    agent.destroy();
  });
});
