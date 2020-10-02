// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import "mocha";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";

import { expect } from "chai";
import { NtlmProxyServer } from "../../src/proxy/ntlm.proxy.server";
import { INtlmProxyMitm } from "../../src/proxy/interfaces/i.ntlm.proxy.mitm";
import { IHttpMitmProxyFacade } from "../../src/proxy/interfaces/i.http.mitm.proxy.facade";
import { IDebugLogger } from "../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../src/util/debug.logger";
import { PortsConfigStoreMock } from "./ports.config.store.mock";

describe("NtlmProxyServer shallow", () => {
  let ntlmProxyServer: NtlmProxyServer;
  let ntlmProxyMitmMock: SubstituteOf<INtlmProxyMitm>;
  let httpMitmProxyMock: SubstituteOf<IHttpMitmProxyFacade>;
  let portsConfigStoreMock: PortsConfigStoreMock;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(function () {
    ntlmProxyMitmMock = Substitute.for<INtlmProxyMitm>();
    httpMitmProxyMock = Substitute.for<IHttpMitmProxyFacade>();
    portsConfigStoreMock = new PortsConfigStoreMock();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyServer = new NtlmProxyServer(
      ntlmProxyMitmMock,
      httpMitmProxyMock,
      portsConfigStoreMock,
      debugMock
    );
  });

  it("start should use a free port if undefined", async function () {
    let listenPort: any;
    httpMitmProxyMock.listen(Arg.all()).mimicks((port: any) => {
      listenPort = port;
      return Promise.resolve("http://127.0.0.1:" + port);
    });

    await ntlmProxyServer.start();
    httpMitmProxyMock.received(1).listen(Arg.any());
    expect(listenPort).to.be.greaterThan(0);
    expect(portsConfigStoreMock.ntlmProxyUrl).to.eq(
      "http://127.0.0.1:" + listenPort
    );
    expect(portsConfigStoreMock.ntlmProxyPort).to.eq(String(listenPort));
  });

  it("start should call init", async function () {
    httpMitmProxyMock
      .listen(Arg.any())
      .returns(Promise.resolve("http://127.0.0.1:2000"));

    await ntlmProxyServer.start();

    httpMitmProxyMock.received(1).use(Arg.any());
  });

  it("start should throw if listen fails", async function () {
    httpMitmProxyMock.listen(Arg.all()).mimicks((port: any) => {
      return Promise.reject("test");
    });

    await expect(ntlmProxyServer.start()).to.be.rejectedWith("test");
  });

  it("init should just initialize once", function () {
    ntlmProxyServer.init();
    httpMitmProxyMock.received(1).use(Arg.any());

    ntlmProxyServer.init();
    httpMitmProxyMock.received(1).use(Arg.any());
  });

  it("stop should close server listener", async function () {
    httpMitmProxyMock
      .listen(Arg.any())
      .returns(Promise.resolve("http://127.0.0.1:2000"));
    await ntlmProxyServer.start();
    await ntlmProxyServer.stop();
    httpMitmProxyMock.received(1).close();
    expect(portsConfigStoreMock.ntlmProxyUrl).to.eq("");
    expect(portsConfigStoreMock.ntlmProxyPort).to.eq("");
  });

  it("stop should throw if close throws", async function () {
    httpMitmProxyMock
      .listen(Arg.any())
      .returns(Promise.resolve("http://127.0.0.1:2000"));
    httpMitmProxyMock.close().mimicks(() => {
      throw new Error("test");
    });
    await ntlmProxyServer.start();
    expect(() => ntlmProxyServer.stop()).to.throw("test");
  });
});
