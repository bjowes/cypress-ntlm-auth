// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";

import * as os from "os";

import { IDebugLogger } from "../../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../../src/util/debug.logger";
import { UpstreamProxyConfigurator } from "../../../src/startup/upstream.proxy.configurator";
import { EnvironmentMock } from "./environment.mock";

describe("UpstreamProxyConfigurator", () => {
  let upstreamProxyConfigurator: UpstreamProxyConfigurator;
  let environmentMock: EnvironmentMock;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(function () {
    environmentMock = new EnvironmentMock();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    upstreamProxyConfigurator = new UpstreamProxyConfigurator(environmentMock, debugMock);
  });

  describe("processNoProxyLoopback", function () {
    it("should not modify NO_PROXY when HTTP_PROXY is not set", function () {
      upstreamProxyConfigurator.processNoProxyLoopback();
      expect(environmentMock.noProxy).toBeUndefined();
    });

    it("should modify NO_PROXY when HTTP_PROXY is set", function () {
      environmentMock.httpProxy = "test";
      upstreamProxyConfigurator.processNoProxyLoopback();
      expect(environmentMock.noProxy).toEqual("localhost,127.0.0.1");
    });

    it("should add both localhost and 127.0.0.1 to NO_PROXY", function () {
      environmentMock.httpProxy = "test";
      upstreamProxyConfigurator.processNoProxyLoopback();
      expect(environmentMock.noProxy).toEqual("localhost,127.0.0.1");
    });

    it("should not add localhost to NO_PROXY if already present variant 1", function () {
      environmentMock.httpProxy = "test";
      environmentMock.noProxy = "localhost";
      upstreamProxyConfigurator.processNoProxyLoopback();
      expect(environmentMock.noProxy).toEqual("localhost,127.0.0.1");
    });

    it("should not add localhost to NO_PROXY if already present variant 2", function () {
      environmentMock.httpProxy = "test";
      environmentMock.noProxy = " localhost ";
      upstreamProxyConfigurator.processNoProxyLoopback();
      expect(environmentMock.noProxy).toEqual("localhost,127.0.0.1");
    });

    it("should not add localhost to NO_PROXY if already present variant 3", function () {
      environmentMock.httpProxy = "test";
      environmentMock.noProxy = "google.com, localhost , ello.com";
      upstreamProxyConfigurator.processNoProxyLoopback();
      expect(environmentMock.noProxy).toEqual("google.com,localhost,ello.com,127.0.0.1");
    });

    it("should not add localhost to NO_PROXY if already present variant 4", function () {
      environmentMock.httpProxy = "test";
      environmentMock.noProxy = "google.com,localhost,ello.com";
      upstreamProxyConfigurator.processNoProxyLoopback();
      expect(environmentMock.noProxy).toEqual("google.com,localhost,ello.com,127.0.0.1");
    });

    it("should not add 127.0.0.1 to NO_PROXY if already present variant 1", function () {
      environmentMock.httpProxy = "test";
      environmentMock.noProxy = "127.0.0.1";
      upstreamProxyConfigurator.processNoProxyLoopback();
      expect(environmentMock.noProxy).toEqual("127.0.0.1,localhost");
    });

    it("should not add 127.0.0.1 to NO_PROXY if already present variant 2", function () {
      environmentMock.httpProxy = "test";
      environmentMock.noProxy = " 127.0.0.1 ";
      upstreamProxyConfigurator.processNoProxyLoopback();
      expect(environmentMock.noProxy).toEqual("127.0.0.1,localhost");
    });

    it("should not add 127.0.0.1 to NO_PROXY if already present variant 3", function () {
      environmentMock.httpProxy = "test";
      environmentMock.noProxy = "google.com, 127.0.0.1 , ello.com";
      upstreamProxyConfigurator.processNoProxyLoopback();
      expect(environmentMock.noProxy).toEqual("google.com,127.0.0.1,ello.com,localhost");
    });

    it("should not add 127.0.0.1 to NO_PROXY if already present variant 4", function () {
      environmentMock.httpProxy = "test";
      environmentMock.noProxy = "google.com,127.0.0.1,ello.com";
      upstreamProxyConfigurator.processNoProxyLoopback();
      expect(environmentMock.noProxy).toEqual("google.com,127.0.0.1,ello.com,localhost");
    });

    it("should not add anything if both are present", function () {
      environmentMock.httpProxy = "test";
      environmentMock.noProxy = "127.0.0.1, localhost, google.com";
      upstreamProxyConfigurator.processNoProxyLoopback();
      expect(environmentMock.noProxy).toEqual("127.0.0.1,localhost,google.com");
    });

    it("should not add anything if <-loopback> is present", function () {
      environmentMock.httpProxy = "test";
      environmentMock.noProxy = "ello.com, <-loopback>";
      upstreamProxyConfigurator.processNoProxyLoopback();
      expect(environmentMock.noProxy).toEqual("ello.com, <-loopback>");
    });
  });

  describe("removeUnusedProxyEnv", function () {
    it("should delete unused proxy environment", function () {
      upstreamProxyConfigurator.removeUnusedProxyEnv();
      if (os.platform() !== "win32") {
        expect(environmentMock.deletedKeys).toContain("http_proxy");
        expect(environmentMock.deletedKeys).toContain("https_proxy");
        expect(environmentMock.deletedKeys).toContain("no_proxy");
      }
      expect(environmentMock.deletedKeys).toContain("npm_config_proxy");
      expect(environmentMock.deletedKeys).toContain("npm_config_https_proxy");
      expect(environmentMock.deletedKeys).toContain("NPM_CONFIG_PROXY");
      expect(environmentMock.deletedKeys).toContain("NPM_CONFIG_HTTPS_PROXY");
    });
  });
});
