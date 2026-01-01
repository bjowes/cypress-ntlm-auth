// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";

import assert from "assert";

import { IDebugLogger } from "../../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../../src/util/debug.logger";
import { PortsConfig } from "../../../src/models/ports.config.model";
import { NtlmProxyHttpClient } from "../../../src/startup/ntlm.proxy.http.client";
import { NtlmProxyExpressServer } from "./ntlm.proxy.express.server";

describe("NtlmProxyHttpClient", () => {
  let httpClient: NtlmProxyHttpClient;
  let ntlmProxyExpressServer: NtlmProxyExpressServer;
  let ntlmProxyUrl: URL;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  before(async function () {
    ntlmProxyExpressServer = new NtlmProxyExpressServer();
    ntlmProxyUrl = await ntlmProxyExpressServer.startHttpServer();
  });

  after(async function () {
    await ntlmProxyExpressServer.stopHttpServer();
  })

  beforeEach(function () {
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    httpClient = new NtlmProxyHttpClient(debugMock);
  });

  describe("request", function () {
    it("should handle response without body", async function () {
      let res = await httpClient.request(ntlmProxyUrl.href, "reset", "POST", undefined);
      
      assert.equal(undefined, res);
      
      debugMock
        .received(1)
        .log("Sending reset request to NTLM proxy " + ntlmProxyUrl.href);
      debugMock.received(1).log("reset request succeeded");
      
    });

    it("should handle response with body", async function () {
      let res = await httpClient.request(ntlmProxyUrl.href, "alive", "GET", undefined);
      
      assert.notEqual(undefined, res);
      assert.equal("test", (res as PortsConfig).configApiUrl);

      debugMock
        .received(1)
        .log("Sending alive request to NTLM proxy " + ntlmProxyUrl.href);
      debugMock.received(1).log("alive request succeeded");
    });

    it("should handle request with body", async function () {
      let testBody = { my: 'test' };
      let res = await httpClient.request(ntlmProxyUrl.href, "ntlm-config", "POST", testBody);
      
      assert.notEqual(undefined, res);
      assert.equal("test", (res as any).my);
      assert.equal("test2", (res as any).your);

      debugMock
        .received(1)
        .log("Sending ntlm-config request to NTLM proxy " + ntlmProxyUrl.href);
      debugMock.received(1).log("ntlm-config request succeeded");
    });

    it("should throw if request returns != 200", async function () {     
      ntlmProxyExpressServer.setCustomStatusCode(404);

      await assert.rejects(
        httpClient.request(ntlmProxyUrl.href, "alive", "GET", undefined),
        /Unexpected response from NTLM proxy: 404$/
      );

      debugMock.received(1).log("Unexpected response from NTLM proxy: 404");
      debugMock.received(1).log("alive request failed");
    });

    it("should throw if request errors", async function () { 
      ntlmProxyExpressServer.closeConnectionOnNextRequest(true);

      await assert.rejects(
        httpClient.request(ntlmProxyUrl.href, "alive", "GET", undefined),
        /An error occurred while communicating with NTLM proxy: socket hang up$/
      );

      debugMock.received(1).log("alive request failed");
    });
  });
});