import assert from "assert";
import net from "net";

import { ProxyFacade } from "./proxy.facade";

import { DependencyInjection } from "../../../src/proxy/dependency.injection";
import { ICoreServer } from "../../../src/proxy/interfaces/i.core.server";
import { TYPES } from "../../../src/proxy/dependency.injection.types";
import { PortsConfig } from "../../../src/models/ports.config.model";
import { URLExt } from "../../../src/util/url.ext";

async function isPortReachable(host: string, port: number) {
  return new Promise<boolean>((resolve, reject) => {
    const connectOptions: net.NetConnectOpts = {
      host: host,
      port: port,
      timeout: 2000,
    };
    const socket = net.connect(connectOptions, () => {
      socket.destroy();
      return resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      return resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      return resolve(false);
    });
  });
}

async function isProxyReachable(ports: PortsConfig): Promise<boolean> {
  const configUrl = new URL(ports.configApiUrl);
  const proxyUrl = new URL(ports.ntlmProxyUrl);

  let reachable = await isPortReachable(
    URLExt.unescapeHostname(proxyUrl),
    URLExt.portOrDefault(proxyUrl)
  );
  if (!reachable) {
    return false;
  }
  reachable = await isPortReachable(
    URLExt.unescapeHostname(configUrl),
    URLExt.portOrDefault(configUrl)
  );
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

  it("starting proxy should return URLs", async function () {
    // Act
    const ports = await coreServer.start(undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;

    assert.ok(ports.configApiUrl.length > 5);
    assert.ok(ports.ntlmProxyUrl.length > 5);
    const reachable = await isProxyReachable(ports);
    assert.equal(reachable, true);
  });

  it("quit command shuts down the proxy", async function () {
    // Act
    const ports = await coreServer.start(undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;

    await proxyFacade.sendQuitCommand(new URL(ports.configApiUrl), true);
    _configApiUrl = undefined;

    const reachable = await isProxyReachable(ports);
    assert.equal(reachable, false);
  });
});
