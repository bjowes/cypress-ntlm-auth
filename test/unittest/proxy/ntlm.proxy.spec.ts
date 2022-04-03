// cSpell:ignore nisse, mnpwr

import * as http from "http";
import express from "express";
import bodyParser from "body-parser";
import assert from "assert";

import { ProxyFacade } from "./proxy.facade";

import { AddressInfo } from "net";
import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { DependencyInjection } from "../../../src/proxy/dependency.injection";
import { ICoreServer } from "../../../src/proxy/interfaces/i.core.server";
import { TYPES } from "../../../src/proxy/dependency.injection.types";

let _configApiUrl: URL | undefined;

let remoteHost = express();
let remoteHostRequestHeaders: http.IncomingHttpHeaders[];
let remoteHostResponseWwwAuthHeaders: string[];
let remoteHostReply: number;
let remoteHostListener: http.Server | undefined;
let remoteHostWithPort: URL;

async function initRemoteHost() {
  remoteHost.use(bodyParser.raw());
  remoteHostReply = 401;
  remoteHost.use((req, res) => {
    remoteHostRequestHeaders.push(req.headers);
    if (remoteHostResponseWwwAuthHeaders.length) {
      let header = remoteHostResponseWwwAuthHeaders.shift();
      if (header) {
        res.setHeader("www-authenticate", header);
      }
    }
    res.sendStatus(remoteHostReply);
  });

  remoteHostListener = await new Promise<http.Server>((resolve, reject) => {
    let listener = remoteHost.listen((err: Error) => {
      if (err) {
        reject(err);
      }
    });
    resolve(listener);
  });
  if (remoteHostListener) {
    let addressInfo = remoteHostListener.address() as AddressInfo;
    remoteHostWithPort = new URL("http://localhost:" + addressInfo.port);
  } else {
    throw new Error("Could not start test server");
  }
}

describe("NTLM Proxy authentication", function () {
  let proxyFacade = new ProxyFacade();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before(async function () {
    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    await initRemoteHost();
  });

  beforeEach(function () {
    this.timeout(2000);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    _configApiUrl = undefined;
    remoteHostRequestHeaders = [];
    remoteHostResponseWwwAuthHeaders = ["NTLM"];
  });

  afterEach(async function () {
    if (_configApiUrl) {
      // Shutdown the proxy listeners to allow a clean exit
      await ProxyFacade.sendQuitCommand(_configApiUrl, true);
      _configApiUrl = undefined;
    }
  });

  after(function () {
    if (remoteHostListener) {
      remoteHostListener.close();
    }
  });

  it("proxy without configuration shall not add authentication header", async function () {
    // Act
    let ports = await coreServer.start(undefined, undefined, undefined);
    _configApiUrl = new URL(ports.configApiUrl);
    let res = await ProxyFacade.sendProxiedHttpRequest(
      new URL(ports.ntlmProxyUrl),
      remoteHostWithPort,
      "GET",
      "/test",
      null
    );
    assert.equal(res.status, 401);
    assert.equal(remoteHostRequestHeaders.length, 1);
    let firstRequestHeaders = remoteHostRequestHeaders.shift();
    assert.notEqual(firstRequestHeaders, null);
    assert.equal(
      firstRequestHeaders && "authorization" in firstRequestHeaders,
      false
    );
  });

  it("proxy with configuration shall not add authentication header without challenge", async function () {
    // Arrange
    const hostConfig: NtlmConfig = {
      ntlmHosts: [remoteHostWithPort.host],
      username: "nisse",
      password: "manpower",
      domain: "mnpwr",
      ntlmVersion: 2,
    };
    remoteHostResponseWwwAuthHeaders = [];

    // Act
    let ports = await coreServer.start(undefined, undefined, undefined);
    _configApiUrl = new URL(ports.configApiUrl);
    let res = await ProxyFacade.sendNtlmConfig(_configApiUrl, hostConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      new URL(ports.ntlmProxyUrl),
      remoteHostWithPort,
      "GET",
      "/test",
      null
    );
    assert.equal(res.status, 401);
    assert.equal(remoteHostRequestHeaders.length, 1);
    let firstRequestHeaders = remoteHostRequestHeaders.shift();
    assert.notEqual(firstRequestHeaders, null);
    assert.equal(
      firstRequestHeaders && "authorization" in firstRequestHeaders,
      false
    );
  });

  it("proxy with configuration shall add authentication header", async function () {
    // Arrange
    const hostConfig: NtlmConfig = {
      ntlmHosts: [remoteHostWithPort.host],
      username: "nisse",
      password: "manpower",
      domain: "mnpwr",
      ntlmVersion: 2,
    };
    remoteHostResponseWwwAuthHeaders.push("test");

    // Act
    let ports = await coreServer.start(undefined, undefined, undefined);
    _configApiUrl = new URL(ports.configApiUrl);
    let res = await ProxyFacade.sendNtlmConfig(_configApiUrl, hostConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      new URL(ports.ntlmProxyUrl),
      remoteHostWithPort,
      "GET",
      "/test",
      null
    );
    assert.equal(res.status, 401);
    assert.equal(remoteHostRequestHeaders.length, 2);
    remoteHostRequestHeaders.shift();
    let firstRequestHeaders = remoteHostRequestHeaders.shift();
    assert.notEqual(firstRequestHeaders, null);
    assert.equal(
      firstRequestHeaders && "authorization" in firstRequestHeaders,
      true
    );
  });

  it("proxy with configuration shall not add authentication header for another host", async function () {
    // Arrange
    const hostConfig: NtlmConfig = {
      ntlmHosts: ["some.other.host.com:4567"],
      username: "nisse",
      password: "manpower",
      domain: "mnpwr",
      ntlmVersion: 2,
    };

    // Act
    let ports = await coreServer.start(undefined, undefined, undefined);
    _configApiUrl = new URL(ports.configApiUrl);
    let res = await ProxyFacade.sendNtlmConfig(_configApiUrl, hostConfig);
    assert.equal(res.status, 200);

    res = await ProxyFacade.sendProxiedHttpRequest(
      new URL(ports.ntlmProxyUrl),
      remoteHostWithPort,
      "GET",
      "/test",
      null
    );
    assert.equal(res.status, 401);
    assert.equal(remoteHostRequestHeaders.length, 1);
    let firstRequestHeaders = remoteHostRequestHeaders.shift();
    assert.notEqual(firstRequestHeaders, null);
    assert.equal(
      firstRequestHeaders && "authorization" in firstRequestHeaders,
      false
    );
  });

  it("proxy shall not add authentication header after reset", async function () {
    // Arrange
    const hostConfig: NtlmConfig = {
      ntlmHosts: [remoteHostWithPort.host],
      username: "nisse",
      password: "manpower",
      domain: "mnpwr",
      ntlmVersion: 2,
    };

    // Act
    let ports = await coreServer.start(undefined, undefined, undefined);
    _configApiUrl = new URL(ports.configApiUrl);
    let res = await ProxyFacade.sendNtlmConfig(_configApiUrl, hostConfig);
    assert.equal(res.status, 200);

    await ProxyFacade.sendNtlmReset(_configApiUrl);

    res = await ProxyFacade.sendProxiedHttpRequest(
      new URL(ports.ntlmProxyUrl),
      remoteHostWithPort,
      "GET",
      "/test",
      null
    );
    assert.equal(res.status, 401);
    assert.equal(remoteHostRequestHeaders.length, 1);
    let firstRequestHeaders = remoteHostRequestHeaders.shift();
    assert.notEqual(firstRequestHeaders, null);
    assert.equal(
      firstRequestHeaders && "authorization" in firstRequestHeaders,
      false
    );
  });

  it("proxy shall return error but keep working after incoming non-proxy request", async function () {
    const hostConfig: NtlmConfig = {
      ntlmHosts: [remoteHostWithPort.host],
      username: "nisse",
      password: "manpower",
      domain: "mnpwr",
      ntlmVersion: 2,
    };
    const ports = await coreServer.start(undefined, undefined, undefined);
    _configApiUrl = new URL(ports.configApiUrl);
    const ntlmProxyUrl = new URL(ports.ntlmProxyUrl);

    let res = await ProxyFacade.sendNtlmConfig(ntlmProxyUrl, hostConfig, 250);
    assert.equal(res.status, 504);

    res = await ProxyFacade.sendProxiedHttpRequest(
      ntlmProxyUrl,
      remoteHostWithPort,
      "GET",
      "/test",
      null
    );
    assert.equal(res.status, 401);
  });
});
