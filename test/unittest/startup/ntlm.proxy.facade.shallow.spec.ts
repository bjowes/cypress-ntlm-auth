// cSpell:ignore nisse, mnpwr, mptest
import { Substitute, Arg } from "@fluffy-spoon/substitute";
import type { SubstituteOf } from "@fluffy-spoon/substitute";

import assert from "assert";

import { HttpRequestInterceptor } from '@mswjs/interceptors/http'


import type { IDebugLogger } from "../../../src/util/interfaces/i.debug.logger.ts";
import { DebugLogger } from "../../../src/util/debug.logger.ts";
import { NtlmProxyFacade } from "../../../src/startup/ntlm.proxy.facade.ts";
import type { PortsConfig } from "../../../src/models/ports.config.model.ts";

describe("NtlmProxyFacade shallow", () => {
const interceptor = new HttpRequestInterceptor()
  let ntlmProxyFacade: NtlmProxyFacade;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();
  let fakePortsConfig: PortsConfig = {
    configApiUrl: "http://localhost:324",
    ntlmProxyUrl: "http://localhost:333",
  };

  before(() => {
    interceptor.apply();
  });

  beforeEach(function () {
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyFacade = new NtlmProxyFacade(debugMock);
    interceptor.removeAllListeners();
  });

  after(() => {
    interceptor.dispose();
  });

  describe("alive", function () {
    it("should send alive to existing proxy", async function () {
      const fakeConfigApiUrl = 'http://127.0.0.1:54321'
      let endpoint = fakeConfigApiUrl + '/alive';
      let received = false;

      interceptor.on('request', ({ request, controller }) => {
        if (request.url !== endpoint && request.method !== 'GET') { assert.fail(); }
        received = true;
        controller.respondWith(
          new Response(
            JSON.stringify(fakePortsConfig),
            {
              status: 200,
              statusText: 'OK',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          )
        )
      });

      let res = await ntlmProxyFacade.alive(fakeConfigApiUrl);
      assert.equal(res.configApiUrl, fakePortsConfig.configApiUrl);
      assert.equal(res.ntlmProxyUrl, fakePortsConfig.ntlmProxyUrl);
      
      assert.equal(received, true);
      debugMock
        .received(1)
        .log("Sending alive request to NTLM proxy " + fakeConfigApiUrl);
      debugMock.received(1).log("alive request succeeded");
    });

    it("should throw if alive errors", async function () {
      const fakeConfigApiUrl = 'http://127.0.0.1:54321'
      let endpoint = fakeConfigApiUrl + '/alive';
      let received = false;

      interceptor.on('request', ({ request, controller }) => {
        if (request.url !== endpoint && request.method !== 'GET') { assert.fail(); }
        received = true;
        controller.respondWith(Response.error());
      });

      await assert.rejects(
        ntlmProxyFacade.alive(fakeConfigApiUrl),
        /An error occurred while communicating with NTLM proxy: Network error$/
      );
      assert.equal(received, true);
      debugMock.received(1).log("alive request failed");
    });

    it("should throw if alive returns != 200", async function () {
      const fakeConfigApiUrl = 'http://127.0.0.1:54321'
      let endpoint = fakeConfigApiUrl + '/alive';
      let received = false;

      interceptor.on('request', ({ request, controller }) => {
        if (request.url !== endpoint && request.method !== 'GET') { assert.fail(); }
        received = true;
        controller.respondWith(
          new Response(
            null,
            {
              status: 404,
              statusText: 'Not Found',
            }
          )
        )
      });

      await assert.rejects(
        ntlmProxyFacade.alive(fakeConfigApiUrl),
        /Unexpected response from NTLM proxy: 404$/
      );
      assert.equal(received, true);
      debugMock.received(1).log("Unexpected response from NTLM proxy: 404");
      debugMock.received(1).log("alive request failed");
    });
  });

  describe("quitIfRunning", function () {
    it("should send quit to existing proxy", async function () {
      const fakeConfigApiUrl = 'http://127.0.0.1:54321'
      let endpoint = fakeConfigApiUrl + '/quit';
      let received = false;

      interceptor.on('request', ({ request, controller }) => {
        if (request.url !== endpoint && request.method !== 'POST') { assert.fail(); }
        received = true;
        controller.respondWith(
          new Response(null,
            {
              status: 200,
              statusText: 'OK'              
            }
          )
        )
      });
      
      await ntlmProxyFacade.quitIfRunning(fakeConfigApiUrl);

      assert.equal(received, true);
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
      const fakeConfigApiUrl = 'http://127.0.0.1:54321'
      let endpoint = fakeConfigApiUrl + '/alive';
      let received = false;

      interceptor.on('request', ({ request, controller }) => {
        if (request.url !== endpoint && request.method !== 'POST') { assert.fail(); }
        received = true;
        controller.respondWith(Response.error());
      });

      await assert.rejects(
        ntlmProxyFacade.quitIfRunning(fakeConfigApiUrl),
        /An error occurred while communicating with NTLM proxy: Network error$/
      );
      assert.equal(received, true);
      debugMock.received(1).log("quit request failed");
    });

    it("should throw if quit returns != 200", async function () {
      const fakeConfigApiUrl = 'http://127.0.0.1:54321'
      let endpoint = fakeConfigApiUrl + '/alive';
      let received = false;

      interceptor.on('request', ({ request, controller }) => {
        if (request.url !== endpoint && request.method !== 'POST') { assert.fail(); }
        received = true;
        controller.respondWith(
          new Response(
            null,
            {
              status: 404,
              statusText: 'Not Found',
            }
          )
        )
      });
        
      await assert.rejects(
        ntlmProxyFacade.quitIfRunning(fakeConfigApiUrl),
        /Unexpected response from NTLM proxy: 404$/
      );
      assert.equal(received, true);
      debugMock.received(1).log("Unexpected response from NTLM proxy: 404");
      debugMock.received(1).log("quit request failed");
    });
  });
});
