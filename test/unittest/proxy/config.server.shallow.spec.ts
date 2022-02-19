// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";
import assert from "assert";

import { ConfigServer } from "../../../src/proxy/config.server";
import { IConfigController } from "../../../src/proxy/interfaces/i.config.controller";
import { IExpressServerFacade } from "../../../src/proxy/interfaces/i.express.server.facade";
import { IDebugLogger } from "../../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../../src/util/debug.logger";
import { PortsConfigStoreMock } from "./ports.config.store.mock";

describe("ConfigServer", () => {
  let configServer: ConfigServer;
  let configControllerMock: SubstituteOf<IConfigController>;
  let portsConfigStoreMock: PortsConfigStoreMock;
  let expressServerMock: SubstituteOf<IExpressServerFacade>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(function () {
    configControllerMock = Substitute.for<IConfigController>();
    portsConfigStoreMock = new PortsConfigStoreMock();
    expressServerMock = Substitute.for<IExpressServerFacade>();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    configServer = new ConfigServer(expressServerMock, configControllerMock, portsConfigStoreMock, debugMock);
  });

  it("start should use port 0 (any free port) if undefined", async function () {
    let listenPort: any;
    expressServerMock.listen(Arg.all()).mimicks((port: any) => {
      listenPort = port === 0 ? 123 : port;
      return Promise.resolve("http://127.0.0.1:" + listenPort);
    });

    await configServer.start();
    expressServerMock.received(1).listen(0);
    assert.equal(123, listenPort);
    assert.equal(portsConfigStoreMock.configApiUrl!.href, new URL("http://127.0.0.1:" + listenPort).href);
  });

  it("start should call init", async function () {
    expressServerMock.listen(Arg.any()).returns(Promise.resolve("http://127.0.0.1:2000"));

    await configServer.start();

    expressServerMock.received(1).use(Arg.any(), Arg.any());
  });

  it("start should throw if listen fails", async function () {
    expressServerMock.listen(Arg.all()).mimicks((port: any) => {
      return Promise.reject(new Error("test"));
    });

    await assert.rejects(configServer.start(), /test$/);
  });

  it("init should just initialize once", function () {
    configServer.init();
    expressServerMock.received(1).use(Arg.any(), Arg.any());

    configServer.init();
    expressServerMock.received(1).use(Arg.any(), Arg.any());
  });

  it("stop should close server listener", async function () {
    expressServerMock.listen(Arg.any()).returns(Promise.resolve("http://127.0.0.1:2000"));
    expressServerMock.close().returns(Promise.resolve());
    await configServer.start();
    await configServer.stop();
    expressServerMock.received(1).close();
    assert.equal(portsConfigStoreMock.configApiUrl, undefined);
  });

  it("stop should throw if close fail", async function () {
    expressServerMock.listen(Arg.any()).returns(Promise.resolve("http://127.0.0.1:2000"));
    expressServerMock.close().returns(Promise.reject(new Error("test")));
    await configServer.start();
    await assert.rejects(configServer.stop(), /test$/);
  });
});
