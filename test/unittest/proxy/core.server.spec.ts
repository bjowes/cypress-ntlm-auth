import * as url from "url";

import isPortReachable from "is-port-reachable";
import { jest } from "@jest/globals";

import { ProxyFacade } from "./proxy.facade";

import { DependencyInjection } from "../../../src/proxy/dependency.injection";
import { ICoreServer } from "../../../src/proxy/interfaces/i.core.server";
import { TYPES } from "../../../src/proxy/dependency.injection.types";
import { PortsConfig } from "../../../src/models/ports.config.model";

async function isProxyReachable(ports: PortsConfig): Promise<boolean> {
  const configUrl = url.parse(ports.configApiUrl);
  const proxyUrl = url.parse(ports.ntlmProxyUrl);

  let reachable = await isPortReachable(+proxyUrl.port, {
    host: proxyUrl.hostname,
  });
  if (!reachable) {
    return false;
  }
  reachable = await isPortReachable(+configUrl.port, {
    host: configUrl.hostname,
  });
  if (!reachable) {
    return false;
  }
  return true;
}

describe("Core server startup and shutdown", () => {
  let proxyFacade = new ProxyFacade();
  let dependencyInjection = new DependencyInjection();
  let coreServer: ICoreServer;
  let _configApiUrl: string | undefined;

  beforeAll(async function () {
    jest.setTimeout(30000);
    await proxyFacade.initMitmProxy();
  });

  beforeEach(function () {
    jest.setTimeout(2000);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    _configApiUrl = undefined;
  });

  afterEach(async function () {
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
    expect(reachable).to.equal(true);
  });

  it("quit command shuts down the proxy, keep portsFile", async function () {
    // Act
    let ports = await coreServer.start(undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;

    await ProxyFacade.sendQuitCommand(ports.configApiUrl, true);
    _configApiUrl = undefined;

    let reachable = await isProxyReachable(ports);
    expect(reachable).to.equal(false);
  });
});
