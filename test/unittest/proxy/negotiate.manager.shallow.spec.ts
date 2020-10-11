// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import "mocha";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";

import { expect } from "chai";
import http from "http";
import { IContext } from "http-mitm-proxy";
import { IDebugLogger } from "../../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../../src/util/debug.logger";
import { toCompleteUrl } from "../../../src/util/url.converter";
import { ConnectionContext } from "../../../src/proxy/connection.context";
import { NtlmStateEnum } from "../../../src/models/ntlm.state.enum";
import { ExpressServer } from "./express.server";
import { NegotiateManager } from "../../../src/proxy/negotiate.manager";
import { IWinSsoFacade } from "../../../src/proxy/interfaces/i.win-sso.facade";
import { ResetServer } from "./reset.server";

describe("NegotiateManager", () => {
  let negotiateManager: NegotiateManager;
  let winSsoFacadeMock: SubstituteOf<IWinSsoFacade>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();
  let expressServer = new ExpressServer();
  let resetServer = new ResetServer();
  let httpUrl: string;
  let resetUrl: string;

  before(async function () {
    httpUrl = await expressServer.startHttpServer(false, undefined);
    resetServer.start();
    resetUrl = resetServer.url();
  });

  beforeEach(async function () {
    winSsoFacadeMock = Substitute.for<IWinSsoFacade>();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    expressServer.sendNtlmType2(null);
    negotiateManager = new NegotiateManager(debugMock);
  });

  after(async function () {
    await expressServer.stopHttpServer();
    resetServer.stop();
  });

  describe("Negotiate", () => {
    it("Successful auth with 1 roundtrip", (done) => {
      const ntlmHostUrl = toCompleteUrl(httpUrl, false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthRequestHeader().returns("Negotiate TEST");
      winSsoFacadeMock.createAuthResponseHeader(Arg.any()).returns("");
      const ctx = Substitute.for<IContext>();
      ctx.proxyToServerRequestOptions.returns({
        protocol: "http:",
        host: "127.0.0.1",
        port: ntlmHostUrl.port,
        method: "GET",
        path: "/get",
      } as any);
      ctx.isSSL.returns(false);
      ctx.serverToProxyResponse.returns({
        statusCode: 999,
        resume: () => {
          return;
        },
      } as any);
      expressServer.sendWwwAuth([
        { header: "Negotiate TestResponse1", status: 200 },
      ]);

      negotiateManager.handshake(
        ctx,
        ntlmHostUrl,
        connectionContext,
        (err, res) => {
          expect(err).to.be.undefined;
          expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(
            NtlmStateEnum.Authenticated
          );
          expect(res.statusCode).to.not.equal(401);
          res.resume();
          return done();
        }
      );
    });

    it("Successful auth with 2 roundtrips", (done) => {
      const ntlmHostUrl = toCompleteUrl(httpUrl, false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthRequestHeader().returns("Negotiate TEST");
      winSsoFacadeMock
        .createAuthResponseHeader(Arg.any())
        .returns("Negotiate TEST", "");
      const ctx = Substitute.for<IContext>();
      ctx.proxyToServerRequestOptions.returns({
        protocol: "http:",
        host: "127.0.0.1",
        port: ntlmHostUrl.port,
        method: "GET",
        path: "/get",
      } as any);
      ctx.isSSL.returns(false);
      ctx.serverToProxyResponse.returns({
        statusCode: 999,
        resume: () => {
          return;
        },
      } as any);
      expressServer.sendWwwAuth([
        { header: "Negotiate TestResponse1", status: 401 },
        { header: "Negotiate TestResponse2", status: 200 },
      ]);

      negotiateManager.handshake(
        ctx,
        ntlmHostUrl,
        connectionContext,
        (err, res) => {
          expect(err).to.be.undefined;
          expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(
            NtlmStateEnum.Authenticated
          );
          expect(res.statusCode).to.not.equal(401);
          res.resume();
          return done();
        }
      );
    });

    it("Successful auth with 3 roundtrips", (done) => {
      const ntlmHostUrl = toCompleteUrl(httpUrl, false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthRequestHeader().returns("Negotiate TEST");
      winSsoFacadeMock
        .createAuthResponseHeader(Arg.any())
        .returns("Negotiate TEST", "Negotiate TEST2", "");
      const ctx = Substitute.for<IContext>();
      ctx.proxyToServerRequestOptions.returns({
        protocol: "http:",
        host: "127.0.0.1",
        port: ntlmHostUrl.port,
        method: "GET",
        path: "/get",
      } as any);
      ctx.isSSL.returns(false);
      ctx.serverToProxyResponse.returns({
        statusCode: 999,
        resume: () => {
          return;
        },
      } as any);
      expressServer.sendWwwAuth([
        { header: "Negotiate TestResponse1", status: 401 },
        { header: "Negotiate TestResponse2", status: 401 },
        { header: "Negotiate TestResponse3", status: 200 },
      ]);

      negotiateManager.handshake(
        ctx,
        ntlmHostUrl,
        connectionContext,
        (err, res) => {
          expect(err).to.be.undefined;
          expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(
            NtlmStateEnum.Authenticated
          );
          expect(res.statusCode).to.not.equal(401);
          res.resume();
          return done();
        }
      );
    });
  });

  describe("Negotiate errors", () => {
    it("Invalid credentials shall be logged and clear auth state", async function () {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(401);
      message.headers.returns({ "www-authenticate": "Negotiate TestToken " });
      const ntlmHostUrl = toCompleteUrl("http://www.google.com:8081", false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type3Sent);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthResponseHeader(Arg.any()).returns(null);

      negotiateManager["handshakeResponse"](
        message,
        ntlmHostUrl,
        connectionContext,
        {},
        false,
        () => {
          return;
        }
      );
      debugMock
        .received(1)
        .log(
          "Negotiate authentication failed (invalid credentials) with host",
          "http://www.google.com:8081/"
        );
      expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(
        NtlmStateEnum.NotAuthenticated
      );
    });

    it("Valid credentials shall set authenticated state", async function () {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(200);
      message.headers.returns({ "www-authenticate": "Negotiate TestToken " });
      const ntlmHostUrl = toCompleteUrl("http://www.google.com:8081", false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type3Sent);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthResponseHeader(Arg.any()).returns(null);

      negotiateManager["handshakeResponse"](
        message,
        ntlmHostUrl,
        connectionContext,
        {},
        false,
        () => {
          return;
        }
      );
      debugMock
        .received(1)
        .log(
          "Negotiate authentication successful with host",
          "http://www.google.com:8081/"
        );
      expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(
        NtlmStateEnum.Authenticated
      );
    });

    it("Response with empty Negotiate token shall be logged and clear auth state", async function () {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(200);
      message.headers.returns({ "www-authenticate": "Negotiate" });
      const ntlmHostUrl = toCompleteUrl("http://www.google.com:8081", false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthResponseHeader(Arg.any()).returns(null);

      negotiateManager["handshakeResponse"](
        message,
        ntlmHostUrl,
        connectionContext,
        {},
        false,
        () => {
          return;
        }
      );
      debugMock
        .received(1)
        .log(
          "Negotiate authentication failed (server responded without token) with host",
          "http://www.google.com:8081/"
        );
      expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(
        NtlmStateEnum.NotAuthenticated
      );
    });

    it("Response without Negotiate header shall be logged and clear auth state", async function () {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(200);
      message.headers.returns({ "www-authenticate": "Basic" });
      const ntlmHostUrl = toCompleteUrl("http://www.google.com:8081", false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthResponseHeader(Arg.any()).returns(null);

      negotiateManager["handshakeResponse"](
        message,
        ntlmHostUrl,
        connectionContext,
        {},
        false,
        (err, res) => {
          expect(err).to.not.be.null;
          expect(err.message).to.be.equal(
            "Negotiate authentication failed (www-authenticate with Negotiate not found in server response) with host http://www.google.com:8081/"
          );
        }
      );
      debugMock
        .received(1)
        .log(
          "Negotiate authentication failed (www-authenticate with Negotiate not found in server response) with host",
          "http://www.google.com:8081/"
        );
      expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(
        NtlmStateEnum.NotAuthenticated
      );
    });

    it("Response without www-authenticate header shall be logged and clear auth state", async function () {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(200);
      message.headers.returns({});
      const ntlmHostUrl = toCompleteUrl("http://www.google.com:8081", false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthResponseHeader(Arg.any()).returns(null);

      negotiateManager["handshakeResponse"](
        message,
        ntlmHostUrl,
        connectionContext,
        {},
        false,
        (err, res) => {
          expect(err).to.not.be.null;
          expect(err.message).to.be.equal(
            "Negotiate authentication failed (www-authenticate with Negotiate not found in server response) with host http://www.google.com:8081/"
          );
        }
      );
      debugMock
        .received(1)
        .log(
          "Negotiate authentication failed (www-authenticate with Negotiate not found in server response) with host",
          "http://www.google.com:8081/"
        );
      expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(
        NtlmStateEnum.NotAuthenticated
      );
    });

    it("Cannot create Negotiate request token", function (done) {
      const ntlmHostUrl = toCompleteUrl(httpUrl, false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthRequestHeader().mimicks(() => {
        throw new Error("Negotiate test");
      });
      const ctx = Substitute.for<IContext>();
      ctx.proxyToServerRequestOptions.returns({} as any);
      ctx.isSSL.returns(false);
      ctx.serverToProxyResponse.returns({ statusCode: 999 } as any);

      negotiateManager.handshake(
        ctx,
        toCompleteUrl(httpUrl, false),
        connectionContext,
        (err, res) => {
          expect(err.message).to.be.equal("Negotiate test");
          expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(
            NtlmStateEnum.NotAuthenticated
          );
          expect(res.statusCode).to.be.equal(999);
          return done();
        }
      );
    });

    it("Error sending Negotiate request message", function (done) {
      const ntlmHostUrl = toCompleteUrl(resetUrl, false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthRequestHeader().returns("Negotiate TEST");
      const ctx = Substitute.for<IContext>();
      ctx.proxyToServerRequestOptions.returns({
        protocol: "http:",
        host: "127.0.0.1",
        port: resetServer.port(),
        method: "GET",
      } as any);
      ctx.isSSL.returns(false);
      ctx.serverToProxyResponse.returns({
        statusCode: 999,
        resume: () => {
          return;
        },
      } as any);

      negotiateManager.handshake(
        ctx,
        ntlmHostUrl,
        connectionContext,
        (err, res) => {
          const linuxErrorExpect = "read ECONNRESET";
          const winMacErrorExpect = "socket hang up";
          const errorMatch =
            err.message === linuxErrorExpect ||
            err.message === winMacErrorExpect;
          expect(errorMatch).to.be.true;
          expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(
            NtlmStateEnum.NotAuthenticated
          );
          expect(res).to.be.undefined;
          return done();
        }
      );
    });

    it("Cannot create Negotiate response message", function (done) {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(999);
      message.headers.returns({
        "www-authenticate": "Negotiate TestServerResponse",
      });
      const ntlmHostUrl = toCompleteUrl(resetUrl, false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthResponseHeader(Arg.any()).mimicks(() => {
        throw new Error("Negotiate test");
      });

      negotiateManager["handshakeResponse"](
        message,
        ntlmHostUrl,
        connectionContext,
        undefined,
        false,
        (err, res) => {
          expect(err.message).to.be.equal("Negotiate test");
          expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(
            NtlmStateEnum.NotAuthenticated
          );
          expect(res.statusCode).to.be.equal(999);
          return done();
        }
      );
    });

    it("Error sending Negotiate response message", function (done) {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(200);
      message.headers.returns({
        "www-authenticate": "Negotiate TestServerResponse",
      });
      let messageEndCb: any;
      message.on(Arg.all()).mimicks((event, listener) => {
        if (((event as any) as string) === "end") {
          messageEndCb = listener;
        }
        return message;
      });
      const ntlmHostUrl = toCompleteUrl(resetUrl, false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock
        .createAuthResponseHeader(Arg.any())
        .returns("Negotiate TestResponse");
      const ctx = Substitute.for<IContext>();
      ctx.proxyToServerRequestOptions.returns({
        protocol: "http:",
        host: "127.0.0.1",
        port: resetServer.port(),
        method: "GET",
      } as any);
      ctx.isSSL.returns(false);
      ctx.serverToProxyResponse.returns({
        statusCode: 999,
        resume: () => {
          return;
        },
      } as any);

      negotiateManager["handshakeResponse"](
        message,
        ntlmHostUrl,
        connectionContext,
        ctx.proxyToServerRequestOptions,
        false,
        (err, res) => {
          const linuxErrorExpect = "read ECONNRESET";
          const winMacErrorExpect = "socket hang up";
          const errorMatch =
            err.message === linuxErrorExpect ||
            err.message === winMacErrorExpect;
          expect(errorMatch).to.be.true;
          expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(
            NtlmStateEnum.NotAuthenticated
          );
          expect(res).to.be.undefined;
          return done();
        }
      );
      messageEndCb();
    });
  });

  describe("Negotiate detection", () => {
    it("should not detect lowercase Negotiate in header", function () {
      let res = Substitute.for<http.IncomingMessage>();
      res.headers.returns({ "www-authenticate": "negotiate" });
      let result = negotiateManager.acceptsNegotiateAuthentication(res);
      expect(result).to.be.false;
    });

    it("should not detect uppercase Negotiate in header", function () {
      let res = Substitute.for<http.IncomingMessage>();
      res.headers.returns({ "www-authenticate": "NEGOTIATE" });
      let result = negotiateManager.acceptsNegotiateAuthentication(res);
      expect(result).to.be.false;
    });

    it("should detect proper case Negotiate in header", function () {
      let res = Substitute.for<http.IncomingMessage>();
      res.headers.returns({ "www-authenticate": "Negotiate" });
      let result = negotiateManager.acceptsNegotiateAuthentication(res);
      expect(result).to.be.true;
    });

    it("should detect Negotiate in mixed header", function () {
      let res = Substitute.for<http.IncomingMessage>();
      res.headers.returns({ "www-authenticate": "NTLM, Negotiate" });
      let result = negotiateManager.acceptsNegotiateAuthentication(res);
      expect(result).to.be.true;
    });

    it("should not detect missing Negotiate", function () {
      let res = Substitute.for<http.IncomingMessage>();
      res.headers.returns({ "www-authenticate": "NTLM, Digest" });
      let result = negotiateManager.acceptsNegotiateAuthentication(res);
      expect(result).to.be.false;
    });
  });
});
