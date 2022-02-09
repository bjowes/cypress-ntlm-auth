// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";
import assert from "assert";

import { IDebugLogger } from "../../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../../src/util/debug.logger";
import { Main } from "../../../src/proxy/main";
import { ICoreServer } from "../../../src/proxy/interfaces/i.core.server";
import { PortsConfig } from "../../../src/models/ports.config.model";

describe("Main shallow", () => {
  let main: Main;
  let coreServerMock: SubstituteOf<ICoreServer>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(function () {
    coreServerMock = Substitute.for<ICoreServer>();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    main = new Main(coreServerMock, debugMock);
  });

  it("Core start pass", async function () {
    let testPorts = {
      configApiUrl: "configApi",
      ntlmProxyUrl: "ntlmProxy",
    } as PortsConfig;
    coreServerMock.start(Arg.all()).mimicks(() => {
      return Promise.resolve(testPorts);
    });
    await main.run(undefined, undefined, undefined);

    coreServerMock.received(1).start(Arg.any());
    debugMock.received(1).log("Startup done!");
    debugMock.received(1).log(testPorts);
  });

  it("Core start fails", async function () {
    coreServerMock.start(Arg.all()).mimicks(() => {
      return Promise.reject(new Error("test error"));
    });
    await assert.rejects(main.run(undefined, undefined, undefined), /test error$/);
    debugMock.received(1).log("Could not start ntlm-proxy");
  });

  it("Core stop", async function () {
    await main.stop();
    coreServerMock.received(1).stop();
  });
});
