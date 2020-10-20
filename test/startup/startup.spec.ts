// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import "mocha";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";

import chaiAsPromised from "chai-as-promised";
import chai from "chai";
const expect = chai.expect;
chai.use(chaiAsPromised);

import { IDebugLogger } from "../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../src/util/debug.logger";
import { Startup } from "../../src/startup/startup";
import { IUpstreamProxyConfigurator } from "../../src/startup/interfaces/i.upstream.proxy.configurator";
import { ICypressFacade } from "../../src/startup/interfaces/i.cypress.facade";
import { IMain } from "../../src/proxy/interfaces/i.main";
import { fail } from "assert";
import { INtlmProxyFacade } from "../../src/startup/interfaces/i.ntlm.proxy.facade";
import { PortsConfig } from "../../src/models/ports.config.model";
import { EnvironmentMock } from "./environment.mock";
import { spy } from "sinon";

describe("Startup shallow", () => {
  let startup: Startup;
  let upstreamProxyConfiguratorMock: SubstituteOf<IUpstreamProxyConfigurator>;
  let proxyMainMock: SubstituteOf<IMain>;
  let cypressFacadeMock: SubstituteOf<ICypressFacade>;
  let externalNtlmProxyFacadeMock: SubstituteOf<INtlmProxyFacade>;
  let environmentMock: EnvironmentMock;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(function () {
    upstreamProxyConfiguratorMock = Substitute.for<
      IUpstreamProxyConfigurator
    >();
    proxyMainMock = Substitute.for<IMain>();
    cypressFacadeMock = Substitute.for<ICypressFacade>();
    externalNtlmProxyFacadeMock = Substitute.for<INtlmProxyFacade>();
    environmentMock = new EnvironmentMock();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    startup = new Startup(
      upstreamProxyConfiguratorMock,
      proxyMainMock,
      cypressFacadeMock,
      environmentMock,
      externalNtlmProxyFacadeMock,
      debugMock
    );
  });

  describe("prepareOptions", function () {
    it("should return empty options with no arguments", async function () {
      const expectOptions = {};
      let passedRunArguments: string[] = [];
      cypressFacadeMock.cypressLoaded().returns(true);
      cypressFacadeMock.parseRunArguments(Arg.all()).mimicks((runArguments) => {
        passedRunArguments = runArguments;
        return Promise.resolve(expectOptions);
      });
      let res = await startup.prepareOptions(["node", "cypress-ntlm", "run"]);
      expect(res).to.eq(expectOptions);
      expect(passedRunArguments).to.deep.eq(["cypress", "run"]);
    });

    it("should always pass run to parseRunArguments", async function () {
      const expectOptions = {};
      let passedRunArguments: string[] = [];
      cypressFacadeMock.cypressLoaded().returns(true);
      cypressFacadeMock.parseRunArguments(Arg.all()).mimicks((runArguments) => {
        passedRunArguments = runArguments;
        return Promise.resolve(expectOptions);
      });
      let res = await startup.prepareOptions(["node", "cypress-ntlm", "open"]);
      expect(res).to.eq(expectOptions);
      expect(passedRunArguments).to.deep.eq(["cypress", "run"]);
    });

    it("should return options with arguments", async function () {
      const expectOptions = {};
      let passedRunArguments: string[] = [];
      cypressFacadeMock.cypressLoaded().returns(true);
      cypressFacadeMock.parseRunArguments(Arg.all()).mimicks((runArguments) => {
        passedRunArguments = runArguments;
        return Promise.resolve(expectOptions);
      });
      let res = await startup.prepareOptions([
        "node",
        "cypress-ntlm",
        "run",
        "--env",
        "YELP=nook",
      ]);
      expect(res).to.eq(expectOptions);
      expect(passedRunArguments).to.deep.eq([
        "cypress",
        "run",
        "--env",
        "YELP=nook",
      ]);
    });

    it("should throw if cypress is not installed", async function () {
      cypressFacadeMock.cypressLoaded().returns(false);
      try {
        await startup.prepareOptions(["node", "cypress-ntlm", "run"]);
        fail();
      } catch (err) {
        expect(err.message).to.eq(
          "cypress-ntlm-auth requires Cypress to be installed."
        );
      }
    });
  });

  describe("argumentsToCypressMode", function () {
    it("should return run on cypress-ntlm run", function () {
      let res = startup.argumentsToCypressMode(["node", "cypress-ntlm", "run"]);
      expect(res).to.eq("run");
    });

    it("should return open on cypress-ntlm open", function () {
      let res = startup.argumentsToCypressMode([
        "node",
        "cypress-ntlm",
        "open",
      ]);
      expect(res).to.eq("open");
    });

    it("should throw on invalid mode", function () {
      expect(() =>
        startup.argumentsToCypressMode(["node", "cypress-ntlm", "verify"])
      ).to.throw(
        "Unsupported command, use cypress-ntlm open or cypress-ntlm run."
      );
    });

    it("should throw on missing cypress-ntlm", function () {
      expect(() => startup.argumentsToCypressMode(["node"])).to.throw(
        "Cannot parse command line arguments"
      );
    });

    it("should accept full path on windows for cypress-ntlm", function () {
      let res = startup.argumentsToCypressMode([
        "node",
        "C:\\test\\cypress-ntlm-auth\\dist\\launchers\\cypress.ntlm.js",
        "run",
      ]);
      expect(res).to.eq("run");
    });

    it("should accept full path on mac/linux for cypress-ntlm", function () {
      let res = startup.argumentsToCypressMode([
        "node",
        "/home/test/cypress/node_modules/.bin/cypress-ntlm",
        "run",
      ]);
      expect(res).to.eq("run");
    });
  });

  describe("run", function () {
    it("should throw if cypress is not installed", async function () {
      cypressFacadeMock.cypressLoaded().returns(false);
      expect(startup.run({})).to.be.rejectedWith(
        "cypress-ntlm-auth requires Cypress to be installed."
      );
    });

    it("should start proxy, call cypress run, return result and stop proxy", async function () {
      cypressFacadeMock.cypressLoaded().returns(true);
      const fakeResult = {};
      cypressFacadeMock.run(Arg.any()).returns(Promise.resolve(fakeResult));
      const options = {};
      let res = await startup.run(options);
      expect(res).to.eq(fakeResult);
      proxyMainMock.received(1).run(undefined, undefined, undefined);
      cypressFacadeMock.received(1).run(options);
      proxyMainMock.received(1).stop();
    });

    it("should throw if cypress run throws, and stop proxyMain", async function () {
      cypressFacadeMock.cypressLoaded().returns(true);
      cypressFacadeMock
        .run(Arg.any())
        .returns(Promise.reject(new Error("FakeError")));
      const options = {};
      await expect(startup.run(options)).to.be.rejectedWith("FakeError");
      proxyMainMock.received(1).run(Arg.all());
      cypressFacadeMock.received(1).run(options);
      proxyMainMock.received(1).stop();
    });

    it("should prepare proxy", async function () {
      cypressFacadeMock.cypressLoaded().returns(true);
      const fakeResult = {};
      cypressFacadeMock.run(Arg.any()).returns(Promise.resolve(fakeResult));
      const options = {};
      const fakePorts: PortsConfig = {
        ntlmProxyUrl: "ntlm-proxy",
        configApiUrl: "config-api",
      };
      proxyMainMock
        .run("http-proxy", "https-proxy", "no-proxy")
        .returns(Promise.resolve(fakePorts));
      environmentMock.httpProxy = "http-proxy";
      environmentMock.httpsProxy = "https-proxy";
      environmentMock.noProxy = "no-proxy";
      let configureSpy = spy(environmentMock, "configureForCypress");
      await startup.run(options);
      proxyMainMock.received(1).run("http-proxy", "https-proxy", "no-proxy");
      upstreamProxyConfiguratorMock.received(1).processNoProxyLoopback();
      upstreamProxyConfiguratorMock.received(1).removeUnusedProxyEnv();
      proxyMainMock.received(1).stop();
      expect(configureSpy.calledOnceWith(fakePorts)).to.be.true;
      configureSpy.restore();
    });

    it("should use external proxy if available", async function () {
      cypressFacadeMock.cypressLoaded().returns(true);
      const fakeResult = {};
      cypressFacadeMock.run(Arg.any()).returns(Promise.resolve(fakeResult));
      const ports: PortsConfig = {
        configApiUrl: "dummy",
        ntlmProxyUrl: "dummy-proxy",
      };
      externalNtlmProxyFacadeMock
        .alive("dummy")
        .returns(Promise.resolve(ports));
      const options = {};
      environmentMock.configApiUrl = "dummy";
      await startup.run(options);
      proxyMainMock.didNotReceive().run(Arg.all());
      externalNtlmProxyFacadeMock.received(1).alive("dummy");
      expect(environmentMock.ntlmProxyUrl).to.eq("dummy-proxy");
      upstreamProxyConfiguratorMock.received(1).processNoProxyLoopback();
      upstreamProxyConfiguratorMock.received(1).removeUnusedProxyEnv();
      proxyMainMock.didNotReceive().stop();
    });

    it("should throw if external proxy is not available", async function () {
      cypressFacadeMock.cypressLoaded().returns(true);
      const fakeResult = {};
      cypressFacadeMock.run(Arg.any()).returns(Promise.resolve(fakeResult));
      externalNtlmProxyFacadeMock
        .alive("dummy")
        .returns(Promise.reject("FakeError"));
      const options = {};
      environmentMock.configApiUrl = "dummy";
      await expect(startup.run(options)).rejectedWith("FakeError");
      proxyMainMock.didNotReceive().run(Arg.all());
      externalNtlmProxyFacadeMock.received(1).alive("dummy");
      upstreamProxyConfiguratorMock.received(1).processNoProxyLoopback();
      upstreamProxyConfiguratorMock.didNotReceive().removeUnusedProxyEnv();
      proxyMainMock.didNotReceive().stop();
    });
  });

  describe("open", function () {
    it("should throw if cypress is not installed", async function () {
      cypressFacadeMock.cypressLoaded().returns(false);
      expect(startup.open({})).to.be.rejectedWith(
        "cypress-ntlm-auth requires Cypress to be installed."
      );
    });

    it("should start proxy, call cypress open, return result and stop proxy", async function () {
      cypressFacadeMock.cypressLoaded().returns(true);
      const fakeResult = {};
      cypressFacadeMock.open(Arg.any()).returns(Promise.resolve(fakeResult));
      const options = {};
      let res = await startup.open(options);
      expect(res).to.eq(fakeResult);
      proxyMainMock.received(1).run(Arg.any());
      cypressFacadeMock.received(1).open(options);
      proxyMainMock.received(1).stop();
    });

    it("should throw if cypress open throws, and stop proxyMain", async function () {
      cypressFacadeMock.cypressLoaded().returns(true);
      cypressFacadeMock
        .open(Arg.any())
        .returns(Promise.reject(new Error("FakeError")));
      const options = {};
      await expect(startup.open(options)).to.be.rejectedWith("FakeError");
      proxyMainMock.received(1).run(Arg.all());
      cypressFacadeMock.received(1).open(options);
      proxyMainMock.received(1).stop();
    });

    it("should prepare proxy", async function () {
      cypressFacadeMock.cypressLoaded().returns(true);
      const fakeResult = {};
      cypressFacadeMock.open(Arg.any()).returns(Promise.resolve(fakeResult));
      const options = {};
      const fakePorts: PortsConfig = {
        ntlmProxyUrl: "ntlm-proxy",
        configApiUrl: "config-api",
      };
      proxyMainMock
        .run("http-proxy", "https-proxy", "no-proxy")
        .returns(Promise.resolve(fakePorts));
      environmentMock.httpProxy = "http-proxy";
      environmentMock.httpsProxy = "https-proxy";
      environmentMock.noProxy = "no-proxy";
      let configureSpy = spy(environmentMock, "configureForCypress");
      await startup.open(options);
      proxyMainMock.received(1).run("http-proxy", "https-proxy", "no-proxy");
      upstreamProxyConfiguratorMock.received(1).processNoProxyLoopback();
      upstreamProxyConfiguratorMock.received(1).removeUnusedProxyEnv();
      proxyMainMock.received(1).stop();
      expect(configureSpy.calledOnceWith(fakePorts)).to.be.true;
      configureSpy.restore();
    });

    it("should use external proxy if available", async function () {
      cypressFacadeMock.cypressLoaded().returns(true);
      const fakeResult = {};
      cypressFacadeMock.open(Arg.any()).returns(Promise.resolve(fakeResult));
      const ports: PortsConfig = {
        configApiUrl: "dummy",
        ntlmProxyUrl: "dummy-proxy",
      };
      externalNtlmProxyFacadeMock
        .alive("dummy")
        .returns(Promise.resolve(ports));
      const options = {};
      environmentMock.configApiUrl = "dummy";
      await startup.open(options);
      proxyMainMock.didNotReceive().run(Arg.all());
      expect(environmentMock.ntlmProxyUrl).to.eq("dummy-proxy");
      upstreamProxyConfiguratorMock.received(1).processNoProxyLoopback();
      upstreamProxyConfiguratorMock.received(1).removeUnusedProxyEnv();
      proxyMainMock.didNotReceive().stop();
    });

    it("should throw if external proxy is not available", async function () {
      cypressFacadeMock.cypressLoaded().returns(true);
      const fakeResult = {};
      cypressFacadeMock.open(Arg.any()).returns(Promise.resolve(fakeResult));
      externalNtlmProxyFacadeMock
        .alive("dummy")
        .returns(Promise.reject("FakeError"));
      const options = {};
      environmentMock.configApiUrl = "dummy";
      await expect(startup.open(options)).rejectedWith("FakeError");
      proxyMainMock.didNotReceive().run(Arg.all());
      externalNtlmProxyFacadeMock.received(1).alive("dummy");
      upstreamProxyConfiguratorMock.received(1).processNoProxyLoopback();
      upstreamProxyConfiguratorMock.didNotReceive().removeUnusedProxyEnv();
      proxyMainMock.didNotReceive().stop();
    });
  });

  describe("stopNtlmProxy", function () {
    it("should stop proxyMain", function () {
      startup["stopNtlmProxy"]();
      proxyMainMock.received(1).stop();
    });

    it("should not stop proxyMain if external proxy", function () {
      startup["_internalNtlmProxy"] = false;
      startup["stopNtlmProxy"]();
      proxyMainMock.didNotReceive().stop();
    });
  });
});
