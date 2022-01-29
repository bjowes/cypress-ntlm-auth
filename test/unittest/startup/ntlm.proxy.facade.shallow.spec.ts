// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";

import nock from "nock";

import { IDebugLogger } from "../../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../../src/util/debug.logger";
import { NtlmProxyFacade } from "../../../src/startup/ntlm.proxy.facade";
import { PortsConfig } from "../../../src/models/ports.config.model";

describe("NtlmProxyFacade shallow", () => {
  let ntlmProxyFacade: NtlmProxyFacade;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();
  let fakePortsConfig: PortsConfig = {
    configApiUrl: "http://localhost:324",
    ntlmProxyUrl: "http://localhost:333",
  };

  beforeEach(function () {
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyFacade = new NtlmProxyFacade(debugMock);
  });

  afterAll(function () {
    nock.cleanAll();
    nock.restore();
  });

  describe("alive", function () {
    it("should send alive to existing proxy", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      const scope = nock(fakeConfigApiUrl).get("/alive").reply(200, fakePortsConfig);
      let res = await ntlmProxyFacade.alive(fakeConfigApiUrl);
      expect(res.configApiUrl).toEqual(fakePortsConfig.configApiUrl);
      expect(res.ntlmProxyUrl).toEqual(fakePortsConfig.ntlmProxyUrl);
      expect(scope.isDone()).toEqual(true);
      debugMock.received(1).log("Sending alive request to NTLM proxy " + fakeConfigApiUrl);
      debugMock.received(1).log("alive request succeeded");
    });

    it("should throw if alive errors", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      const scope = nock(fakeConfigApiUrl)
        .get("/alive")
        .replyWithError({ code: "ETIMEDOUT", message: "Request timeout" });

      await expect(ntlmProxyFacade.alive(fakeConfigApiUrl)).rejects.toThrow(
        "An error occurred while communicating with NTLM proxy: Request timeout"
      );
      expect(scope.isDone()).toEqual(true);
      debugMock.received(1).log("alive request failed");
    });

    it("should throw if alive returns != 200", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      const scope = nock(fakeConfigApiUrl).get("/alive").reply(404);
      await expect(ntlmProxyFacade.alive(fakeConfigApiUrl)).rejects.toThrow("Unexpected response from NTLM proxy: 404");
      expect(scope.isDone()).toEqual(true);
      debugMock.received(1).log("Unexpected response from NTLM proxy: 404");
      debugMock.received(1).log("alive request failed");
    });
  });

  describe("quitIfRunning", function () {
    it("should send quit to existing proxy", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      const scope = nock(fakeConfigApiUrl).post("/quit").reply(200);
      await ntlmProxyFacade.quitIfRunning(fakeConfigApiUrl);
      expect(scope.isDone()).toEqual(true);
      debugMock.received(1).log("Sending quit request to NTLM proxy " + fakeConfigApiUrl);
      debugMock.received(1).log("quit request succeeded");
    });

    it("should not send quit if no existing proxy", async function () {
      await ntlmProxyFacade.quitIfRunning();
      debugMock.received(1).log("CYPRESS_NTLM_AUTH_API is not set, nothing to do.");
    });

    it("should throw if quit errors", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      const scope = nock(fakeConfigApiUrl)
        .post("/quit")
        .replyWithError({ code: "ETIMEDOUT", message: "Request timeout" });

      await expect(ntlmProxyFacade.quitIfRunning(fakeConfigApiUrl)).rejects.toThrow(
        "An error occurred while communicating with NTLM proxy: Request timeout"
      );
      expect(scope.isDone()).toEqual(true);
      debugMock.received(1).log("quit request failed");
    });

    it("should throw if quit returns != 200", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      const scope = nock(fakeConfigApiUrl).post("/quit").reply(404);
      await expect(ntlmProxyFacade.quitIfRunning(fakeConfigApiUrl)).rejects.toThrow(
        "Unexpected response from NTLM proxy: 404"
      );
      expect(scope.isDone()).toEqual(true);
      debugMock.received(1).log("Unexpected response from NTLM proxy: 404");
      debugMock.received(1).log("quit request failed");
    });
  });
});
