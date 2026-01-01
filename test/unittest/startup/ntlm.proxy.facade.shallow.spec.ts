// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";

import assert from "assert";

import { IDebugLogger } from "../../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../../src/util/debug.logger";
import { NtlmProxyFacade } from "../../../src/startup/ntlm.proxy.facade";
import { PortsConfig } from "../../../src/models/ports.config.model";
import { INtlmProxyHttpClient } from "../../../src/startup/interfaces/i.ntlm.proxy.http.client";
import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";

describe("NtlmProxyFacade shallow", () => {
  let ntlmProxyFacade: NtlmProxyFacade;
  let debugMock: SubstituteOf<IDebugLogger>;
  let httpClientMock: SubstituteOf<INtlmProxyHttpClient>;
  let debugLogger = new DebugLogger();
  let fakePortsConfig: PortsConfig = {
    configApiUrl: "http://localhost:324",
    ntlmProxyUrl: "http://localhost:333",
  };

  beforeEach(function () {
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    httpClientMock = Substitute.for<INtlmProxyHttpClient>();
    ntlmProxyFacade = new NtlmProxyFacade(debugMock, httpClientMock);
  });

  describe("alive", function () {
    it("should send alive to existing proxy", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      httpClientMock.request(
        Arg.is(url => url == fakeConfigApiUrl),
        Arg.is(path => path == "alive"),
        Arg.is(method => method == "GET"),
        undefined)
        .mimicks((url, path, method, body) => Promise.resolve(fakePortsConfig));

      let res = await ntlmProxyFacade.alive(fakeConfigApiUrl);
      assert.equal(res.configApiUrl, fakePortsConfig.configApiUrl);
      assert.equal(res.ntlmProxyUrl, fakePortsConfig.ntlmProxyUrl);
    });

    it("should throw if alive errors", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      httpClientMock.request(
        Arg.is(url => url == fakeConfigApiUrl),
        Arg.is(path => path == "alive"),
        Arg.is(method => method == "GET"),
        undefined)
        .mimicks((url, path, method, body) => Promise.reject(Object.assign(new Error('Request timeout'))));

      await assert.rejects(
        ntlmProxyFacade.alive(fakeConfigApiUrl),
        /Request timeout$/
      );
    });    
  });

  describe("reset", function () {
    it("should send reset to existing proxy", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      httpClientMock.request(
        Arg.is(url => url == fakeConfigApiUrl),
        Arg.is(path => path == "reset"),
        Arg.is(method => method == "POST"),
        undefined)
        .mimicks((url, path, method, body) => Promise.resolve(fakePortsConfig));

      let res = await ntlmProxyFacade.reset(fakeConfigApiUrl);
      assert.equal(undefined, res);
    });

    it("should throw if reset errors", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      httpClientMock.request(
        Arg.is(url => url == fakeConfigApiUrl),
        Arg.is(path => path == "reset"),
        Arg.is(method => method == "POST"),
        undefined)
        .mimicks((url, path, method, body) => Promise.reject(Object.assign(new Error('Request timeout'))));

      await assert.rejects(
        ntlmProxyFacade.reset(fakeConfigApiUrl),
        /Request timeout$/
      );
    });    
  });

  describe("ntlm", function () {
    it("should send ntlm-config to existing proxy", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      let ntlmConfig: NtlmConfig = { ntlmHosts: [], username: 'user', password: 'pass', ntlmVersion: 1 };

      httpClientMock.request(
        Arg.is(url => url == fakeConfigApiUrl),
        Arg.is(path => path == "ntlm-config"),
        Arg.is(method => method == "POST"),
        Arg.is(body => body == ntlmConfig))
        .mimicks((url, path, method, body) => Promise.resolve(fakePortsConfig));

      let res = await ntlmProxyFacade.ntlm(fakeConfigApiUrl, ntlmConfig);
      assert.equal(undefined, res);
    });

    it("should throw if ntlm-config errors", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      let ntlmConfig: NtlmConfig = { ntlmHosts: [], username: 'user', password: 'pass', ntlmVersion: 1 };

      httpClientMock.request(
        Arg.is(url => url == fakeConfigApiUrl),
        Arg.is(path => path == "ntlm-config"),
        Arg.is(method => method == "POST"),
        Arg.is(body => body == ntlmConfig))
        .mimicks((url, path, method, body) => Promise.reject(Object.assign(new Error('Request timeout'))));

      await assert.rejects(
        ntlmProxyFacade.ntlm(fakeConfigApiUrl, ntlmConfig),
        /Request timeout$/
      );
    });    
  });

  describe("ntlmSso", function () {
    it("should send ntlm-sso to existing proxy", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      let ntlmConfig: NtlmSsoConfig = { ntlmHosts: [] };

      httpClientMock.request(
        Arg.is(url => url == fakeConfigApiUrl),
        Arg.is(path => path == "ntlm-sso"),
        Arg.is(method => method == "POST"),
        Arg.is(body => body == ntlmConfig))
        .mimicks((url, path, method, body) => Promise.resolve(fakePortsConfig));

      let res = await ntlmProxyFacade.ntlmSso(fakeConfigApiUrl, ntlmConfig);
      assert.equal(undefined, res);
    });

    it("should throw if ntlm-sso errors", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      let ntlmConfig: NtlmSsoConfig = { ntlmHosts: [] };

      httpClientMock.request(
        Arg.is(url => url == fakeConfigApiUrl),
        Arg.is(path => path == "ntlm-sso"),
        Arg.is(method => method == "POST"),
        Arg.is(body => body == ntlmConfig))
        .mimicks((url, path, method, body) => Promise.reject(Object.assign(new Error('Request timeout'))));

      await assert.rejects(
        ntlmProxyFacade.ntlmSso(fakeConfigApiUrl, ntlmConfig),
        /Request timeout$/
      );
    });    
  });

  describe("quitIfRunning", function () {
    it("should send quit to existing proxy", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      httpClientMock.request(
        Arg.is(url => url == fakeConfigApiUrl),
        Arg.is(path => path == "quit"),
        Arg.is(method => method == "POST"),
        undefined)
        .mimicks((url, path, method, body) => Promise.resolve(undefined));

      let res = await ntlmProxyFacade.quitIfRunning(fakeConfigApiUrl);
      assert.equal(true, res);
    });

    it("should not send quit if no existing proxy", async function () {
      let res = await ntlmProxyFacade.quitIfRunning();
      assert.equal(false, res);
      debugMock
        .received(1)
        .log("CYPRESS_NTLM_AUTH_API is not set, nothing to do.");
    });

    it("should throw if quit errors", async function () {
      let fakeConfigApiUrl = "http://localhost:50997";
      httpClientMock.request(
        Arg.is(url => url == fakeConfigApiUrl),
        Arg.is(path => path == "quit"),
        Arg.is(method => method == "POST"),
        undefined)
        .mimicks((url, path, method, body) => Promise.reject(Object.assign(new Error('Request timeout'))));

      await assert.rejects(
        ntlmProxyFacade.quitIfRunning(fakeConfigApiUrl),
        /Request timeout$/
      );
    });
  });
});