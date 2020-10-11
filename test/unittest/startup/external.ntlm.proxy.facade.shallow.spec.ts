// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import "mocha";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";

import { expect } from "chai";
import nock from "nock";

import { IDebugLogger } from "../../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../../src/util/debug.logger";
import { ExternalNtlmProxyFacade } from "../../../src/startup/external.ntlm.proxy.facade";
import { PortsConfig } from "../../../src/models/ports.config.model";

describe("ExternalNtlmProxyFacade shallow", () => {
  let externalNtlmProxyFacade: ExternalNtlmProxyFacade;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();
  let fakePortsConfig: PortsConfig = {
    configApiUrl: "http://localhost:324",
    ntlmProxyUrl: "http://localhost:333",
  };

  beforeEach(function () {
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    externalNtlmProxyFacade = new ExternalNtlmProxyFacade(debugMock);
  });

  after(function () {
    nock.cleanAll();
    nock.restore();
  });

  describe("alive", function () {
    it("should send alive to existing proxy", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      const scope = nock(fakeConfigApiUrl)
        .get("/alive")
        .reply(200, fakePortsConfig);
      let res = await externalNtlmProxyFacade.alive(fakeConfigApiUrl);
      expect(res).to.deep.eq(fakePortsConfig);
      expect(scope.isDone()).to.be.true;
      debugMock.received(1).log("Sending alive request to external NTLM proxy");
      debugMock.received(1).log("External NTLM proxy is alive");
    });

    it("should throw if alive errors", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      const scope = nock(fakeConfigApiUrl)
        .get("/alive")
        .replyWithError({ code: "ETIMEDOUT", message: "Request timeout" });

      await expect(
        externalNtlmProxyFacade.alive(fakeConfigApiUrl)
      ).to.be.rejectedWith(
        "An error occured while communicating with external NTLM proxy: Request timeout"
      );
      expect(scope.isDone()).to.be.true;
      debugMock.received(1).log("Alive request failed");
    });

    it("should throw if alive returns != 200", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      const scope = nock(fakeConfigApiUrl).get("/alive").reply(404);
      await expect(
        externalNtlmProxyFacade.alive(fakeConfigApiUrl)
      ).to.be.rejectedWith("Unexpected response from external NTLM proxy: 404");
      expect(scope.isDone()).to.be.true;
      debugMock
        .received(1)
        .log("Unexpected response from external NTLM proxy: 404");
      debugMock.received(1).log("Alive request failed");
    });
  });

  describe("quitIfRunning", function () {
    it("should send quit to existing proxy", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      const scope = nock(fakeConfigApiUrl).post("/quit").reply(200);
      await externalNtlmProxyFacade.quitIfRunning(fakeConfigApiUrl);
      expect(scope.isDone()).to.be.true;
      debugMock
        .received(1)
        .log("Sending shutdown command to external NTLM proxy");
      debugMock.received(1).log("Shutdown successful");
    });

    it("should not send quit if no existing proxy", async function () {
      await externalNtlmProxyFacade.quitIfRunning();
      debugMock
        .received(1)
        .log("CYPRESS_NTLM_AUTH_API is not set, nothing to do.");
    });

    it("should throw if quit errors", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      const scope = nock(fakeConfigApiUrl)
        .post("/quit")
        .replyWithError({ code: "ETIMEDOUT", message: "Request timeout" });

      await expect(
        externalNtlmProxyFacade.quitIfRunning(fakeConfigApiUrl)
      ).to.be.rejectedWith(
        "An error occured while communicating with external NTLM proxy: Request timeout"
      );
      expect(scope.isDone()).to.be.true;
      debugMock.received(1).log("Shutdown request failed");
    });

    it("should throw if quit returns != 200", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      const scope = nock(fakeConfigApiUrl).post("/quit").reply(404);
      await expect(
        externalNtlmProxyFacade.quitIfRunning(fakeConfigApiUrl)
      ).to.be.rejectedWith("Unexpected response from external NTLM proxy: 404");
      expect(scope.isDone()).to.be.true;
      debugMock
        .received(1)
        .log("Unexpected response from external NTLM proxy: 404");
      debugMock.received(1).log("Shutdown request failed");
    });
  });
});
