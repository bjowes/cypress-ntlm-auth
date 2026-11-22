// cSpell:ignore nisse, mnpwr, mptest
import { Substitute, Arg } from "@fluffy-spoon/substitute";
import type { SubstituteOf } from "@fluffy-spoon/substitute";

import { getLocal } from "mockttp";
import assert from "assert";

import type IDebugLogger from "../../../src/util/interfaces/i.debug.logger.ts";
import DebugLogger from "../../../src/util/debug.logger.ts";
import NtlmProxyFacade from "../../../src/startup/ntlm.proxy.facade.ts";
import type { PortsConfig } from "../../../src/models/ports.config.model.ts";

describe("NtlmProxyFacade shallow", () => {
  const mockServer = getLocal();
  let ntlmProxyFacade: NtlmProxyFacade;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();
  let fakePortsConfig: PortsConfig = {
    configApiUrl: "http://localhost:324",
    ntlmProxyUrl: "http://localhost:333",
  };

  before(async () => {
    await mockServer.start();
  });

  beforeEach(async function () {
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyFacade = new NtlmProxyFacade(debugMock);
    await mockServer.reset();
  });

  after(async () => {
    await mockServer.stop();
  });

  describe("alive", function () {
    it("should send alive to existing proxy", async function () {
      let endpoint = '/alive';
      let scope = await mockServer
        .forGet(endpoint)
        .thenReply(200, JSON.stringify(fakePortsConfig),
          {"content-type": "application/json"});
      let fakeConfigApiUrl = mockServer.urlFor(endpoint);

      let res = await ntlmProxyFacade.alive(fakeConfigApiUrl);
      assert.equal(res.configApiUrl, fakePortsConfig.configApiUrl);
      assert.equal(res.ntlmProxyUrl, fakePortsConfig.ntlmProxyUrl);
      
      assert.equal(await scope.isPending(), false);
      debugMock
        .received(1)
        .log("Sending alive request to NTLM proxy " + fakeConfigApiUrl);
      debugMock.received(1).log("alive request succeeded");
    });

    it("should throw if alive errors", async function () {
      let endpoint = '/alive';
      let scope = await mockServer
        .forGet(endpoint)
        .thenResetConnection();
      let fakeConfigApiUrl = mockServer.urlFor(endpoint);

      await assert.rejects(
        ntlmProxyFacade.alive(fakeConfigApiUrl),
        /An error occurred while communicating with NTLM proxy: read ECONNRESET$/
      );
      assert.equal(await scope.isPending(), false);
      debugMock.received(1).log("alive request failed");
    });

    it("should throw if alive returns != 200", async function () {
      let endpoint = '/alive';
      let scope = await mockServer
        .forGet(endpoint)
        .thenReply(404);
      let fakeConfigApiUrl = mockServer.urlFor(endpoint);

      await assert.rejects(
        ntlmProxyFacade.alive(fakeConfigApiUrl),
        /Unexpected response from NTLM proxy: 404$/
      );
      assert.equal(await scope.isPending(), false);
      debugMock.received(1).log("Unexpected response from NTLM proxy: 404");
      debugMock.received(1).log("alive request failed");
    });
  });

  describe("quitIfRunning", function () {
    it("should send quit to existing proxy", async function () {
      let endpoint = '/quit';
      let scope = await mockServer
        .forPost(endpoint)
        .thenReply(200);
      let fakeConfigApiUrl = mockServer.urlFor(endpoint);
      
      await ntlmProxyFacade.quitIfRunning(fakeConfigApiUrl);

      assert.equal(await scope.isPending(), false);
      debugMock
        .received(1)
        .log("Sending quit request to NTLM proxy " + fakeConfigApiUrl);
      debugMock.received(1).log("quit request succeeded");
    });

    it("should not send quit if no existing proxy", async function () {
      await ntlmProxyFacade.quitIfRunning();
      debugMock
        .received(1)
        .log("CYPRESS_NTLM_AUTH_API is not set, nothing to do.");
    });

    it("should throw if quit errors", async function () {
      let endpoint = '/quit';
      let scope = await mockServer
        .forPost(endpoint)
        .thenResetConnection();
      let fakeConfigApiUrl = mockServer.urlFor(endpoint);

      await assert.rejects(
        ntlmProxyFacade.quitIfRunning(fakeConfigApiUrl),
        /An error occurred while communicating with NTLM proxy: read ECONNRESET$/
      );
      assert.equal(await scope.isPending(), false);
      debugMock.received(1).log("quit request failed");
    });

    it("should throw if quit returns != 200", async function () {
      let endpoint = '/quit';
      let scope = await mockServer
        .forPost(endpoint)
        .thenReply(404);
      let fakeConfigApiUrl = mockServer.urlFor(endpoint);
        
      await assert.rejects(
        ntlmProxyFacade.quitIfRunning(fakeConfigApiUrl),
        /Unexpected response from NTLM proxy: 404$/
      );
      assert.equal(await scope.isPending(), false);
      debugMock.received(1).log("Unexpected response from NTLM proxy: 404");
      debugMock.received(1).log("quit request failed");
    });    
  });
});
