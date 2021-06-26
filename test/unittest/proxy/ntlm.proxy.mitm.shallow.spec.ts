// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import "mocha";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";
import net from "net";
import http from "http";
import ws from "ws";

import { expect } from "chai";
import { IConfigStore } from "../../../src/proxy/interfaces/i.config.store";
import { IConnectionContextManager } from "../../../src/proxy/interfaces/i.connection.context.manager";
import { INtlmManager } from "../../../src/proxy/interfaces/i.ntlm.manager";
import { IUpstreamProxyManager } from "../../../src/proxy/interfaces/i.upstream.proxy.manager";
import { NtlmProxyMitm } from "../../../src/proxy/ntlm.proxy.mitm";
import { IContext } from "http-mitm-proxy";
import { IDebugLogger } from "../../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../../src/util/debug.logger";
import { ExpressServer } from "./express.server";
import { INegotiateManager } from "../../../src/proxy/interfaces/i.negotiate.manager";
import { interfaces } from "inversify";
import { IWinSsoFacade } from "../../../src/proxy/interfaces/i.win-sso.facade";
import { PortsConfigStoreMock } from "./ports.config.store.mock";
import { IHttpsValidation } from "../../../src/proxy/interfaces/i.https.validation";

describe("NtlmProxyMitm error logging", () => {
  let ntlmProxyMitm: NtlmProxyMitm;
  let configStoreMock: SubstituteOf<IConfigStore>;
  let portsConfigStoreMock: PortsConfigStoreMock;
  let connectionContextManagerMock: SubstituteOf<IConnectionContextManager>;
  let winSsoFacadeMock: SubstituteOf<interfaces.Newable<IWinSsoFacade>>;
  let negotiateManagerMock: SubstituteOf<INegotiateManager>;
  let ntlmManagerMock: SubstituteOf<INtlmManager>;
  let upstreamProxyManagerMock: SubstituteOf<IUpstreamProxyManager>;
  let httpsValidationMock: SubstituteOf<IHttpsValidation>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(function () {
    configStoreMock = Substitute.for<IConfigStore>();
    portsConfigStoreMock = new PortsConfigStoreMock();
    connectionContextManagerMock = Substitute.for<IConnectionContextManager>();
    winSsoFacadeMock = Substitute.for<interfaces.Newable<IWinSsoFacade>>();
    negotiateManagerMock = Substitute.for<INegotiateManager>();
    ntlmManagerMock = Substitute.for<INtlmManager>();
    upstreamProxyManagerMock = Substitute.for<IUpstreamProxyManager>();
    httpsValidationMock = Substitute.for<IHttpsValidation>();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyMitm = new NtlmProxyMitm(
      configStoreMock,
      portsConfigStoreMock,
      connectionContextManagerMock,
      winSsoFacadeMock,
      negotiateManagerMock,
      ntlmManagerMock,
      upstreamProxyManagerMock,
      httpsValidationMock,
      debugMock
    );
  });

  it("connection errors should not throw when no context", async function () {
    const error: NodeJS.ErrnoException = {
      message: "testmessage",
      name: "testname",
      code: "code",
    };
    ntlmProxyMitm.onError(undefined, error, "SOME");
    debugMock.received(1).log("SOME" + " on " + "" + ":", error);
  });

  it("connection errors should not throw when no clientToProxyRequest in context", async function () {
    const error: NodeJS.ErrnoException = {
      message: "testmessage",
      name: "testname",
      code: "code",
    };
    const ctx = Substitute.for<IContext>();
    ctx.clientToProxyRequest.returns(undefined);
    ntlmProxyMitm.onError(ctx, error, "SOME");
    debugMock.received(1).log("SOME" + " on " + "" + ":", error);
  });

  it("connection errors should log to debug", async function () {
    const error: NodeJS.ErrnoException = {
      message: "testmessage",
      name: "testname",
      code: "code",
    };
    const message = Substitute.for<http.IncomingMessage>();
    const ctx = Substitute.for<IContext>();
    ctx.clientToProxyRequest.returns(message);
    message.url.returns("/testurl");
    ntlmProxyMitm.onError(ctx, error, "SOME");
    debugMock.received(1).log("SOME" + " on " + "/testurl" + ":", error);
  });

  it("chrome startup connection tests (host without port) should not throw", function () {
    const error: NodeJS.ErrnoException = {
      message: "testmessage",
      name: "testname",
      code: "ENOTFOUND",
    };
    const message = Substitute.for<http.IncomingMessage>();
    const ctx = Substitute.for<IContext>();
    ctx.clientToProxyRequest.returns(message);
    const mockHost = "nctwerijlksf";
    message.headers.returns({ host: mockHost });
    message.method.returns("HEAD");
    message.url.returns("/");

    ntlmProxyMitm.onError(ctx, error, "PROXY_TO_SERVER_REQUEST_ERROR");
    debugMock
      .received(1)
      .log(
        "Chrome startup HEAD request detected (host: " +
          mockHost +
          "). Ignoring connection error."
      );
  });

  it("chrome startup connection tests (host with port) should not throw", function () {
    const error: NodeJS.ErrnoException = {
      message: "testmessage",
      name: "testname",
      code: "ENOTFOUND",
    };
    const message = Substitute.for<http.IncomingMessage>();
    const ctx = Substitute.for<IContext>();
    ctx.clientToProxyRequest.returns(message);
    const mockHost = "nctwerijlksf:80";
    message.headers.returns({ host: mockHost });
    message.method.returns("HEAD");
    message.url.returns("/");

    ntlmProxyMitm.onError(ctx, error, "PROXY_TO_SERVER_REQUEST_ERROR");
    debugMock
      .received(1)
      .log(
        "Chrome startup HEAD request detected (host: " +
          mockHost +
          "). Ignoring connection error."
      );
  });
});

describe("NtlmProxyMitm REQUEST", () => {
  let ntlmProxyMitm: NtlmProxyMitm;
  let configStoreMock: SubstituteOf<IConfigStore>;
  let portsConfigStoreMock: PortsConfigStoreMock;
  let connectionContextManagerMock: SubstituteOf<IConnectionContextManager>;
  let winSsoFacadeMock: SubstituteOf<interfaces.Newable<IWinSsoFacade>>;
  let negotiateManagerMock: SubstituteOf<INegotiateManager>;
  let ntlmManagerMock: SubstituteOf<INtlmManager>;
  let upstreamProxyManagerMock: SubstituteOf<IUpstreamProxyManager>;
  let httpsValidationMock: SubstituteOf<IHttpsValidation>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(async function () {
    configStoreMock = Substitute.for<IConfigStore>();
    portsConfigStoreMock = new PortsConfigStoreMock();
    connectionContextManagerMock = Substitute.for<IConnectionContextManager>();
    winSsoFacadeMock = Substitute.for<interfaces.Newable<IWinSsoFacade>>();
    negotiateManagerMock = Substitute.for<INegotiateManager>();
    ntlmManagerMock = Substitute.for<INtlmManager>();
    upstreamProxyManagerMock = Substitute.for<IUpstreamProxyManager>();
    httpsValidationMock = Substitute.for<IHttpsValidation>();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyMitm = new NtlmProxyMitm(
      configStoreMock,
      portsConfigStoreMock,
      connectionContextManagerMock,
      winSsoFacadeMock,
      negotiateManagerMock,
      ntlmManagerMock,
      upstreamProxyManagerMock,
      httpsValidationMock,
      debugMock
    );
  });

  it("invalid url should throw", async function () {
    const message = Substitute.for<http.IncomingMessage>();
    const ctx = Substitute.for<IContext>();
    ctx.clientToProxyRequest.returns(message);
    message.headers.returns({ hostMissing: "test" });
    let callbackCount = 0;
    let callbackWithErrorCount = 0;
    await expect(() =>
      ntlmProxyMitm.onRequest(ctx, (err: Error) => {
        callbackCount++;
        if (err) {
          callbackWithErrorCount++;
          throw err;
        }
      })
    ).throws(
      'Invalid request - Could not read "host" header or "host" header refers to this proxy'
    );
    expect(callbackCount).to.equal(1);
    expect(callbackWithErrorCount).to.equal(1);
  });
});

describe("NtlmProxyMitm CONNECT", () => {
  let ntlmProxyMitm: NtlmProxyMitm;
  let configStoreMock: SubstituteOf<IConfigStore>;
  let portsConfigStoreMock: PortsConfigStoreMock;
  let connectionContextManagerMock: SubstituteOf<IConnectionContextManager>;
  let winSsoFacadeMock: SubstituteOf<interfaces.Newable<IWinSsoFacade>>;
  let negotiateManagerMock: SubstituteOf<INegotiateManager>;
  let ntlmManagerMock: SubstituteOf<INtlmManager>;
  let upstreamProxyManagerMock: SubstituteOf<IUpstreamProxyManager>;
  let httpsValidationMock: SubstituteOf<IHttpsValidation>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  let httpsUrl: string;
  let urlNoProtocol: string;
  let socketMock: SubstituteOf<net.Socket>;
  let expressServer = new ExpressServer();

  let socketEventListener: (err: NodeJS.ErrnoException) => void;
  let serverStream: NodeJS.WritableStream;

  before(async function () {
    httpsUrl = await expressServer.startHttpsServer(false, undefined);
    urlNoProtocol = httpsUrl.substring(httpsUrl.indexOf("localhost"));
  });

  beforeEach(async function () {
    socketEventListener = undefined;
    serverStream = undefined;

    socketMock = Substitute.for<net.Socket>();
    socketMock.on(Arg.all()).mimicks((event: string, listener) => {
      if (event === "error") {
        socketEventListener = listener;
      }
      return socketMock;
    });
    socketMock
      .write(Arg.any(), Arg.any(), Arg.any())
      .mimicks((str, encoding, cb) => {
        cb();
        return true;
      });
    socketMock.pipe(Arg.all()).mimicks((stream) => {
      serverStream = stream;
      return socketMock;
    });

    configStoreMock = Substitute.for<IConfigStore>();
    configStoreMock.existsOrUseSso(Arg.any()).returns(false);

    portsConfigStoreMock = new PortsConfigStoreMock();
    connectionContextManagerMock = Substitute.for<IConnectionContextManager>();
    winSsoFacadeMock = Substitute.for<interfaces.Newable<IWinSsoFacade>>();
    negotiateManagerMock = Substitute.for<INegotiateManager>();
    ntlmManagerMock = Substitute.for<INtlmManager>();
    upstreamProxyManagerMock = Substitute.for<IUpstreamProxyManager>();
    upstreamProxyManagerMock.hasHttpsUpstreamProxy(Arg.any()).returns(false);
    httpsValidationMock = Substitute.for<IHttpsValidation>();

    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyMitm = new NtlmProxyMitm(
      configStoreMock,
      portsConfigStoreMock,
      connectionContextManagerMock,
      winSsoFacadeMock,
      negotiateManagerMock,
      ntlmManagerMock,
      upstreamProxyManagerMock,
      httpsValidationMock,
      debugMock
    );
  });

  after(async function () {
    await expressServer.stopHttpsServer();
  });

  it("invalid url should not throw", async function () {
    let req = Substitute.for<http.IncomingMessage>();
    req.url.returns(null);
    let callbackCount = 0;
    ntlmProxyMitm.onConnect(req, socketMock, "", (err: Error) => {
      callbackCount++;
      if (err) throw err;
    });
    expect(callbackCount).to.equal(1);
  });

  it("unknown socket error after connect should not throw", async function () {
    let req = Substitute.for<http.IncomingMessage>();
    req.url.returns(urlNoProtocol);
    const error: NodeJS.ErrnoException = {
      message: "testmessage",
      name: "testname",
      code: "ENOTFOUND",
    };

    ntlmProxyMitm.onConnect(req, socketMock, "", (err: Error) => {
      if (err) throw err;
    });
    await waitForServerStream();
    socketEventListener.call(this, error);
    debugMock
      .received(1)
      .log(
        "Got unexpected error on " +
          "CLIENT_TO_PROXY_SOCKET. Target: " +
          urlNoProtocol,
        error
      );
    serverStream.end();
  });

  it("ECONNRESET socket error after connect should not throw", async function () {
    let req = Substitute.for<http.IncomingMessage>();
    req.url.returns(urlNoProtocol);
    const error: NodeJS.ErrnoException = {
      message: "testmessage",
      name: "testname",
      code: "ECONNRESET",
    };

    ntlmProxyMitm.onConnect(req, socketMock, "", (err: Error) => {
      if (err) throw err;
    });
    await waitForServerStream();
    socketEventListener.call(this, error);
    debugMock
      .received(1)
      .log(
        "Got ECONNRESET on " +
          "CLIENT_TO_PROXY_SOCKET" +
          ", ignoring. Target: " +
          urlNoProtocol
      );
    serverStream.end();
  });

  it("unknown peer socket error after connect should not throw", async function () {
    let req = Substitute.for<http.IncomingMessage>();
    req.url.returns(urlNoProtocol);
    const error: NodeJS.ErrnoException = {
      message: "testmessage",
      name: "testname",
      code: "ENOTFOUND",
    };

    ntlmProxyMitm.onConnect(req, socketMock, "", (err: Error) => {
      if (err) throw err;
    });
    await waitForServerStream();
    serverStream.emit("error", error);
    debugMock
      .received(1)
      .log(
        "Got unexpected error on " +
          "PROXY_TO_SERVER_SOCKET. Target: " +
          urlNoProtocol,
        error
      );
    serverStream.end();
  });

  it("ECONNRESET peer socket error after connect should not throw", async function () {
    let req = Substitute.for<http.IncomingMessage>();
    req.url.returns(urlNoProtocol);
    const error: NodeJS.ErrnoException = {
      message: "testmessage",
      name: "testname",
      code: "ECONNRESET",
    };

    ntlmProxyMitm.onConnect(req, socketMock, "", (err: Error) => {
      if (err) throw err;
    });
    await waitForServerStream();
    serverStream.emit("error", error);
    debugMock
      .received(1)
      .log(
        "Got ECONNRESET on " +
          "PROXY_TO_SERVER_SOCKET" +
          ", ignoring. Target: " +
          urlNoProtocol
      );
    serverStream.end();
  });

  it("should send 502 response if target is unreachable", async function () {
    let req = Substitute.for<http.IncomingMessage>();
    let freePort = await getFreePort();
    socketMock.end(Arg.any(), Arg.any()).mimicks((data, enc) => {
      socketMock.received(1).end("HTTP/1.1 502 Bad Gateway\r\n\r\n", "utf8");
      return true;
    });
    req.url.returns("localhost:" + freePort);
    ntlmProxyMitm.onConnect(req, socketMock, "", (err: Error) => {
      if (err) throw err;
    });
  });

  const sleepMs = (ms: number) => new Promise((res) => setTimeout(res, ms));
  async function sleep(ms: number): Promise<void> {
    await sleepMs(ms);
  }

  async function waitForServerStream(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      for (let i = 0; i < 40; i++) {
        if (serverStream) {
          resolve();
        }
        await sleep(25);
      }
      reject();
    });
  }

  function getFreePort(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      let server = http.createServer();
      server.listen(0);
      server.on("listening", function () {
        let port = (server.address() as net.AddressInfo).port;
        server.close();
        resolve(port);
      });
      server.on("error", function (err) {
        reject(err);
      });
    });
  }
});

describe("NtlmProxyMitm WebSocketClose", () => {
  let ntlmProxyMitm: NtlmProxyMitm;
  let configStoreMock: SubstituteOf<IConfigStore>;
  let portsConfigStoreMock: PortsConfigStoreMock;
  let connectionContextManagerMock: SubstituteOf<IConnectionContextManager>;
  let winSsoFacadeMock: SubstituteOf<interfaces.Newable<IWinSsoFacade>>;
  let negotiateManagerMock: SubstituteOf<INegotiateManager>;
  let ntlmManagerMock: SubstituteOf<INtlmManager>;
  let upstreamProxyManagerMock: SubstituteOf<IUpstreamProxyManager>;
  let httpsValidationMock: SubstituteOf<IHttpsValidation>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(async function () {
    configStoreMock = Substitute.for<IConfigStore>();
    configStoreMock.existsOrUseSso(Arg.any()).returns(false);

    portsConfigStoreMock = new PortsConfigStoreMock();
    connectionContextManagerMock = Substitute.for<IConnectionContextManager>();
    winSsoFacadeMock = Substitute.for<interfaces.Newable<IWinSsoFacade>>();
    negotiateManagerMock = Substitute.for<INegotiateManager>();
    ntlmManagerMock = Substitute.for<INtlmManager>();
    upstreamProxyManagerMock = Substitute.for<IUpstreamProxyManager>();
    upstreamProxyManagerMock.hasHttpsUpstreamProxy(Arg.any()).returns(false);
    httpsValidationMock = Substitute.for<IHttpsValidation>();

    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyMitm = new NtlmProxyMitm(
      configStoreMock,
      portsConfigStoreMock,
      connectionContextManagerMock,
      winSsoFacadeMock,
      negotiateManagerMock,
      ntlmManagerMock,
      upstreamProxyManagerMock,
      httpsValidationMock,
      debugMock
    );
  });

  it("normal close code should go to callback", async function () {
    const ctx = Substitute.for<IContext>();
    let callbackCount = 0;
    ntlmProxyMitm.onWebSocketClose(ctx, 1000, null, (err: Error) => {
      callbackCount++;
      if (err) throw err;
    });
    expect(callbackCount).to.equal(1);
  });

  it("1005 close code from client websocket should terminate server websocket", async function () {
    const serverWsMock = Substitute.for<ws>();
    const ctx = Substitute.for<IContext>();
    ctx.closedByServer.returns(false);
    ctx.proxyToServerWebSocket.returns(serverWsMock);
    let callbackCount = 0;
    ntlmProxyMitm.onWebSocketClose(ctx, 1005, null, (err: Error) => {
      callbackCount++;
      if (err) throw err;
    });
    expect(callbackCount).to.equal(0);
    serverWsMock.received(1).terminate();
  });

  it("1006 close code from client websocket should terminate server websocket", async function () {
    const serverWsMock = Substitute.for<ws>();
    const ctx = Substitute.for<IContext>();
    ctx.closedByServer.returns(false);
    ctx.proxyToServerWebSocket.returns(serverWsMock);
    let callbackCount = 0;
    ntlmProxyMitm.onWebSocketClose(ctx, 1006, null, (err: Error) => {
      callbackCount++;
      if (err) throw err;
    });
    expect(callbackCount).to.equal(0);
    serverWsMock.received(1).terminate();
    serverWsMock.received(1).url;
  });

  it("1005 close code from server websocket should terminate client websocket", async function () {
    const clientWsMock = Substitute.for<ws>();
    const serverWsMock = Substitute.for<ws>();
    const ctx = Substitute.for<IContext>();
    ctx.closedByServer.returns(true);
    ctx.clientToProxyWebSocket.returns(clientWsMock);
    ctx.proxyToServerWebSocket.returns(serverWsMock);
    let callbackCount = 0;
    ntlmProxyMitm.onWebSocketClose(ctx, 1005, null, (err: Error) => {
      callbackCount++;
      if (err) throw err;
    });
    expect(callbackCount).to.equal(0);
    clientWsMock.received(1).terminate();
    serverWsMock.received(1).url;
  });

  it("1006 close code from server websocket should terminate client websocket", async function () {
    const clientWsMock = Substitute.for<ws>();
    const serverWsMock = Substitute.for<ws>();
    const ctx = Substitute.for<IContext>();
    ctx.closedByServer.returns(true);
    ctx.clientToProxyWebSocket.returns(clientWsMock);
    ctx.proxyToServerWebSocket.returns(serverWsMock);
    let callbackCount = 0;
    ntlmProxyMitm.onWebSocketClose(ctx, 1006, null, (err: Error) => {
      callbackCount++;
      if (err) throw err;
    });
    expect(callbackCount).to.equal(0);
    clientWsMock.received(1).terminate();
    serverWsMock.received(1).url;
  });
});
