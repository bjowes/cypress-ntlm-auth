// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";

import * as http from "http";
import { IConfigStore } from "../../../src/proxy/interfaces/i.config.store";
import { IContext } from "http-mitm-proxy";
import { IDebugLogger } from "../../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../../src/util/debug.logger";
import { NtlmManager } from "../../../src/proxy/ntlm.manager";
import { toCompleteUrl } from "../../../src/util/url.converter";
import { ConnectionContext } from "../../../src/proxy/connection.context";
import { NtlmStateEnum } from "../../../src/models/ntlm.state.enum";
import { ExpressServer } from "./express.server";
import { INtlm } from "../../../src/ntlm/interfaces/i.ntlm";
import { NtlmMessage } from "../../../src/ntlm/ntlm.message";
import { Ntlm } from "../../../src/ntlm/ntlm";
import { NtlmHost } from "../../../src/models/ntlm.host.model";

describe("NtlmManager", () => {
  let ntlmManager: NtlmManager;
  let configStoreMock: SubstituteOf<IConfigStore>;
  let ntlmMock: SubstituteOf<INtlm>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();
  let expressServer = new ExpressServer();
  let httpUrl: string;
  let ntlm = new Ntlm();

  beforeAll(async function () {
    httpUrl = await expressServer.startHttpServer(false, undefined);
  });

  beforeEach(async function () {
    configStoreMock = Substitute.for<IConfigStore>();
    ntlmMock = Substitute.for<INtlm>();
    ntlmMock.createType1Message(Arg.all()).mimicks(() => new NtlmMessage(Buffer.alloc(0)));
    ntlmMock.createType3Message(Arg.all()).mimicks(() => new NtlmMessage(Buffer.alloc(0)));
    ntlmMock.decodeType2Message(Arg.all()).mimicks(ntlm.decodeType2Message);
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    expressServer.sendNtlmType2(null);
    ntlmManager = new NtlmManager(configStoreMock, ntlmMock, debugMock);
  });

  afterAll(async function () {
    await expressServer.stopHttpServer();
  });

  describe("NTLM errors", () => {
    it("Invalid credentials shall be logged and clear auth state", async function () {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(401);
      const ntlmHostUrl = toCompleteUrl("http://www.google.com:8081", false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type3Sent);

      ntlmManager["handshakeResponse"](message, ntlmHostUrl, connectionContext, () => {
        return;
      });
      debugMock
        .received(1)
        .log("NTLM authentication failed (invalid credentials) with host", "http://www.google.com:8081/");
      expect(connectionContext.getState(ntlmHostUrl)).toEqual(NtlmStateEnum.NotAuthenticated);
    });

    it("Valid credentials shall set authenticated state", async function () {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(200);
      const ntlmHostUrl = toCompleteUrl("http://www.google.com:8081", false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type3Sent);

      ntlmManager["handshakeResponse"](message, ntlmHostUrl, connectionContext, () => {
        return;
      });
      expect(connectionContext.getState(ntlmHostUrl)).toEqual(NtlmStateEnum.Authenticated);
    });

    it("Unexpected NTLM message shall be logged and clear auth state", async function () {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(200);
      const ntlmHostUrl = toCompleteUrl("http://www.google.com:8081", false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);

      ntlmManager["handshakeResponse"](message, ntlmHostUrl, connectionContext, () => {
        return;
      });
      debugMock
        .received(1)
        .log(
          "Response from server in unexpected NTLM state " + NtlmStateEnum.Type1Sent + ", resetting NTLM auth. Host",
          "http://www.google.com:8081/"
        );
      expect(connectionContext.getState(ntlmHostUrl)).toEqual(NtlmStateEnum.NotAuthenticated);
    });

    it("Non Base64 in NTLM message", function (done) {
      expressServer.sendNtlmType2("ÅÄÖåäö");
      const ctx = Substitute.for<IContext>();
      const ntlmConfig = {
        ntlmHost: httpUrl.replace("http://", ""),
        username: "nisse",
        password: "pwd",
        workstation: "mpw",
        domain: "",
      } as NtlmHost;
      const ntlmHostUrl = toCompleteUrl(httpUrl, false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
      configStoreMock.get(Arg.all()).returns(ntlmConfig);
      let agent = new http.Agent({ keepAlive: true });
      ctx.proxyToServerRequestOptions.returns({
        host: ntlmHostUrl.hostname,
        method: "GET",
        headers: {},
        path: "/get",
        port: ntlmHostUrl.port as any,
        agent: agent,
      });
      ctx.isSSL.returns(false);

      ntlmManager.handshake(ctx, toCompleteUrl(httpUrl, false), connectionContext, false, (err) => {
        expect(err.message).toEqual("Cannot parse NTLM message type 2 from host " + ntlmHostUrl.href);
        expect(connectionContext.getState(ntlmHostUrl)).toEqual(NtlmStateEnum.NotAuthenticated);
        agent.destroy();
        return done();
      });
    });

    it("Not type 2 in NTLM message", function (done) {
      expressServer.sendNtlmType2(
        "TWFuIGlzIGRpc3Rpbmd1aXNoZWQsIG5vdCBvbmx5IGJ5IGhpcyByZWFzb24sIGJ1dCBieSB0aGlzIHNpbmd1bGFyIHBhc3Npb24gZnJvbSBvdGhlciBhbmltYWxzLCB3aGljaCBpcyBhIGx1c3Qgb2YgdGhlIG1pbmQsIHRoYXQgYnkgYSBwZXJzZXZlcmFuY2Ugb2YgZGVsaWdodCBpbiB0aGUgY29udGludWVkIGFuZCBpbmRlZmF0aWdhYmxlIGdlbmVyYXRpb24gb2Yga25vd2xlZGdlLCBleGNlZWRzIHRoZSBzaG9ydCB2ZWhlbWVuY2Ugb2YgYW55IGNhcm5hbCBwbGVhc3VyZS4="
      );
      const ctx = Substitute.for<IContext>();
      const ntlmConfig = {
        ntlmHost: httpUrl.replace("http://", ""),
        username: "nisse",
        password: "pwd",
        workstation: "mpw",
        domain: "",
      } as NtlmHost;
      const ntlmHostUrl = toCompleteUrl(httpUrl, false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
      configStoreMock.get(Arg.all()).returns(ntlmConfig);
      let agent = new http.Agent({ keepAlive: true });
      ctx.proxyToServerRequestOptions.returns({
        host: ntlmHostUrl.hostname,
        method: "GET",
        headers: {},
        path: "/get",
        port: ntlmHostUrl.port as any,
        agent: agent,
      });
      ctx.isSSL.returns(false);

      ntlmManager.handshake(ctx, toCompleteUrl(httpUrl, false), connectionContext, false, (err) => {
        expect(err.message).toEqual("Cannot parse NTLM message type 2 from host " + ntlmHostUrl.href);
        expect(connectionContext.getState(ntlmHostUrl)).toEqual(NtlmStateEnum.NotAuthenticated);
        agent.destroy();
        return done();
      });
    });

    describe("NTLM detection", () => {
      it("should detect lowercase NTLM in header", function () {
        let res = Substitute.for<http.IncomingMessage>();
        res.headers.returns({ "www-authenticate": "ntlm" });
        let result = ntlmManager.acceptsNtlmAuthentication(res);
        expect(result).toEqual(true);
      });

      it("should detect uppercase NTLM in header", function () {
        let res = Substitute.for<http.IncomingMessage>();
        res.headers.returns({ "www-authenticate": "NTLM" });
        let result = ntlmManager.acceptsNtlmAuthentication(res);
        expect(result).toEqual(true);
      });

      it("should detect NTLM in mixed header", function () {
        let res = Substitute.for<http.IncomingMessage>();
        res.headers.returns({ "www-authenticate": "Negotiate, NTLM" });
        let result = ntlmManager.acceptsNtlmAuthentication(res);
        expect(result).toEqual(true);
      });

      it("should not detect missing NTLM", function () {
        let res = Substitute.for<http.IncomingMessage>();
        res.headers.returns({ "www-authenticate": "Negotiate, Digest" });
        let result = ntlmManager.acceptsNtlmAuthentication(res);
        expect(result).toEqual(false);
      });
    });
  });
});
