import "mocha";

import sinon from "sinon";
import { expect } from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);

import url from "url";
import axios, { AxiosRequestConfig } from "axios";

const isPortReachable = require("is-port-reachable");

import { ProxyFacade } from "./proxy.facade";

import { DependencyInjection } from "../../src/proxy/dependency.injection";
import { ICoreServer } from "../../src/proxy/interfaces/i.core.server";
import { TYPES } from "../../src/proxy/dependency.injection.types";
import { PortsConfig } from "../../src/models/ports.config.model";

async function isProxyReachable(ports: PortsConfig): Promise<boolean> {
  const configUrl = url.parse(ports.configApiUrl);
  const proxyUrl = url.parse(ports.ntlmProxyUrl);

  let reachable = await isPortReachable(proxyUrl.port, {
    host: proxyUrl.hostname,
  });
  if (!reachable) {
    return false;
  }
  reachable = await isPortReachable(configUrl.port, {
    host: configUrl.hostname,
  });
  if (!reachable) {
    return false;
  }
  return true;
}

describe("Core server startup and shutdown", () => {
  let httpRequestStub: sinon.SinonStub<
    [string, any?, (AxiosRequestConfig | undefined)?],
    Promise<{}>
  >;
  let proxyFacade = new ProxyFacade();
  let dependencyInjection = new DependencyInjection();
  let coreServer: ICoreServer;
  let _configApiUrl: string | undefined;

  before(async function () {
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
  });

  beforeEach(function () {
    this.timeout(2000);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    _configApiUrl = undefined;
  });

  afterEach(async function () {
    if (httpRequestStub) {
      httpRequestStub.restore();
    }
    if (_configApiUrl) {
      // Shutdown the proxy listeners to allow a clean exit
      await coreServer.stop();
    }
  });

  it("starting proxy should write portsFile", async function () {
    // Act
    let ports = await coreServer.start(undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;

    expect(ports.configApiUrl.length).to.be.greaterThan(5);
    expect(ports.ntlmProxyUrl.length).to.be.greaterThan(5);
    let reachable = await isProxyReachable(ports);
    expect(reachable, "Proxy should be reachable").to.be.true;
  });

  it("quit command shuts down the proxy, keep portsFile", async function () {
    // Act
    let ports = await coreServer.start(undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;

    await ProxyFacade.sendQuitCommand(ports.configApiUrl, true);
    _configApiUrl = undefined;

    let reachable = await isProxyReachable(ports);
    expect(reachable, "Proxy should not be reachable").to.be.false;
  });
});
