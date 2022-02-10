import assert from "assert";

import isPortReachable from "is-port-reachable";

import { ProxyFacade } from "./proxy.facade";

import { DependencyInjection } from "../../../src/proxy/dependency.injection";
import { ICoreServer } from "../../../src/proxy/interfaces/i.core.server";
import { TYPES } from "../../../src/proxy/dependency.injection.types";
import { PortsConfig } from "../../../src/models/ports.config.model";
import { URLExt } from "../../../src/util/url.ext";

async function isProxyReachable(ports: PortsConfig): Promise<boolean> {
  const configUrl = new URLExt(ports.configApiUrl);
  const proxyUrl = new URLExt(ports.ntlmProxyUrl);

  let reachable = await isPortReachable(proxyUrl.portOrDefault, {
    host: proxyUrl.hostname,
  });
  if (!reachable) {
    return false;
  }
  reachable = await isPortReachable(configUrl.portOrDefault, {
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
    if (_configApiUrl) {
      // Shutdown the proxy listeners to allow a clean exit
      await coreServer.stop();
    }
  });

  it("starting proxy should write portsFile", async function () {
    // Act
    let ports = await coreServer.start(undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;

    assert.ok(ports.configApiUrl.length > 5);
    assert.ok(ports.ntlmProxyUrl.length > 5);
    let reachable = await isProxyReachable(ports);
    assert.equal(reachable, true);
  });

  it("quit command shuts down the proxy, keep portsFile", async function () {
    // Act
    let ports = await coreServer.start(undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;

    await ProxyFacade.sendQuitCommand(ports.configApiUrl, true);
    _configApiUrl = undefined;

    let reachable = await isProxyReachable(ports);
    assert.equal(reachable, false);
  });
});
