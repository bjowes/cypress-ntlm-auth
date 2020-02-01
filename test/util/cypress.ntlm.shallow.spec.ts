// cSpell:ignore nisse, mnpwr, mptest
import "reflect-metadata";
import "mocha";
import { Substitute, SubstituteOf, Arg } from "@fluffy-spoon/substitute";

import { expect } from "chai";
import sinon from "sinon";
import axios, { AxiosRequestConfig } from "axios";

import { IDebugLogger } from "../../src/util/interfaces/i.debug.logger";
import { DebugLogger } from "../../src/util/debug.logger";
import { PortsFile } from "../../src/models/ports.file.model";
import { CypressNtlm } from "../../src/util/cypress.ntlm";
import { IPortsFileService } from "../../src/util/interfaces/i.ports.file.service";

describe("CypressNtlm shallow", () => {
  let cypressNtlm: CypressNtlm;
  let portsFileServiceMock: SubstituteOf<IPortsFileService>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();
  let httpRequestStub: sinon.SinonStub<
    [string, AxiosRequestConfig?],
    Promise<{}>
  >;

  beforeEach(function() {
    portsFileServiceMock = Substitute.for<IPortsFileService>();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    cypressNtlm = new CypressNtlm(portsFileServiceMock, debugMock);
  });

  afterEach(function() {
    if (httpRequestStub) {
      httpRequestStub.restore();
    }
  });

  it("should send alive to existing proxy", async function() {
    httpRequestStub = sinon.stub(axios, "get");
    let callUrl = "";
    let callOptions = {};
    httpRequestStub.callsFake((url: string, options: any) => {
      callUrl = url;
      callOptions = options;
      return Promise.resolve({ status: 200 });
    });
    const portsFile = {
      configApiUrl: "configApi",
      ntlmProxyUrl: "ntlmProxy"
    } as PortsFile;
    portsFileServiceMock.recentlyModified().returns(true);
    portsFileServiceMock.exists().returns(true);
    portsFileServiceMock.parse().returns(portsFile);

    let result = await cypressNtlm.checkProxyIsRunning(5000, 400);

    expect(httpRequestStub.calledOnce).to.be.true;
    expect(callUrl).to.be.equal(portsFile.configApiUrl + "/alive");
    expect(callOptions).to.be.deep.equal({ timeout: 1000 });
    expect(result).to.be.deep.equal(portsFile);
    portsFileServiceMock.received(1).recentlyModified();
    portsFileServiceMock.received(1).exists();
    debugMock
      .received(0)
      .log(
        "Older ports file present. Waiting 2000 ms for new proxy instance to remove it."
      );
    debugMock.received(1).log("Found running ntlm-proxy!");
  });

  it("should check for ports file multiple times", async function() {
    this.timeout(5000);
    let recentlyModifiedCalls = 0;
    portsFileServiceMock.recentlyModified().mimicks(() => {
      recentlyModifiedCalls++;
      return false;
    });
    let existsCalls = 0;
    portsFileServiceMock.exists().mimicks(() => {
      existsCalls++;
      return false;
    });

    await expect(cypressNtlm.checkProxyIsRunning(3000, 400)).to.be.rejectedWith(
      "ntlm-proxy not found before time out"
    );

    expect(recentlyModifiedCalls).to.be.equal(1);
    expect(existsCalls).to.be.at.least(2);
    debugMock
      .received(1)
      .log(
        "Older ports file present. Waiting 2000 ms for new proxy instance to remove it."
      );
  });

  it("should wait for new ports file when old ports file is present", async function() {
    this.timeout(5000);
    httpRequestStub = sinon.stub(axios, "get");
    let callUrl = "";
    let callOptions = {};
    httpRequestStub.callsFake((url: string, options: any) => {
      callUrl = url;
      callOptions = options;
      return Promise.resolve({ status: 200 });
    });
    const portsFile = {
      configApiUrl: "configApi",
      ntlmProxyUrl: "ntlmProxy"
    } as PortsFile;
    portsFileServiceMock.recentlyModified().returns(false);
    portsFileServiceMock.exists().returns(true);
    portsFileServiceMock.parse().returns(portsFile);

    let result = await cypressNtlm.checkProxyIsRunning(5000, 400);

    expect(result).to.be.deep.equal(portsFile);
    portsFileServiceMock.received(1).recentlyModified();
    portsFileServiceMock.received(1).exists();
    debugMock
      .received(1)
      .log(
        "Older ports file present. Waiting 2000 ms for new proxy instance to remove it."
      );
  });

  it("should retry if parsing of ports file fails", async function() {
    let recentlyModifiedCalls = 0;
    portsFileServiceMock.recentlyModified().mimicks(() => {
      recentlyModifiedCalls++;
      return true;
    });
    let existsCalls = 0;
    portsFileServiceMock.exists().mimicks(() => {
      existsCalls++;
      return true;
    });
    let parseCalls = 0;
    portsFileServiceMock.parse().mimicks(() => {
      parseCalls++;
      throw new Error("test");
    });

    await expect(cypressNtlm.checkProxyIsRunning(1000, 400)).to.be.rejectedWith(
      "ntlm-proxy not found before time out"
    );

    expect(recentlyModifiedCalls).to.be.equal(1);
    expect(existsCalls).to.be.at.least(2);
    expect(parseCalls).to.be.at.least(2);

    debugMock
      .received()
      .log(
        "Failed to parse ports file. May just have been removed. Retrying..."
      );
  });

  it("should retry if contacting proxy fails", async function() {
    httpRequestStub = sinon.stub(axios, "get");
    let callUrl = "";
    let callOptions = {};
    httpRequestStub.callsFake((url: string, options: any) => {
      callUrl = url;
      callOptions = options;
      return Promise.resolve({ status: 500 });
    });
    const portsFile = {
      configApiUrl: "configApi",
      ntlmProxyUrl: "ntlmProxy"
    } as PortsFile;
    let recentlyModifiedCalls = 0;
    portsFileServiceMock.recentlyModified().mimicks(() => {
      recentlyModifiedCalls++;
      return true;
    });
    let existsCalls = 0;
    portsFileServiceMock.exists().mimicks(() => {
      existsCalls++;
      return true;
    });
    let parseCalls = 0;
    portsFileServiceMock.parse().mimicks(() => {
      parseCalls++;
      return portsFile;
    });

    await expect(cypressNtlm.checkProxyIsRunning(1000, 400)).to.be.rejectedWith(
      "ntlm-proxy not found before time out"
    );

    expect(recentlyModifiedCalls).to.be.equal(1);
    expect(existsCalls).to.be.at.least(2);
    expect(parseCalls).to.be.at.least(2);
    expect(httpRequestStub.callCount).to.be.at.least(2);

    debugMock
      .received()
      .log(
        "Invalid response from ntlm-proxy. May just have been removed. Retrying..."
      );
  });

  it("should retry if contacting proxy rejects", async function() {
    httpRequestStub = sinon.stub(axios, "get");
    let callUrl = "";
    let callOptions = {};
    httpRequestStub.callsFake((url: string, options: any) => {
      callUrl = url;
      callOptions = options;
      return Promise.reject(new Error("test"));
    });
    const portsFile = {
      configApiUrl: "configApi",
      ntlmProxyUrl: "ntlmProxy"
    } as PortsFile;
    let recentlyModifiedCalls = 0;
    portsFileServiceMock.recentlyModified().mimicks(() => {
      recentlyModifiedCalls++;
      return true;
    });
    let existsCalls = 0;
    portsFileServiceMock.exists().mimicks(() => {
      existsCalls++;
      return true;
    });
    let parseCalls = 0;
    portsFileServiceMock.parse().mimicks(() => {
      parseCalls++;
      return portsFile;
    });

    await expect(cypressNtlm.checkProxyIsRunning(1000, 400)).to.be.rejectedWith(
      "ntlm-proxy not found before time out"
    );

    expect(recentlyModifiedCalls).to.be.equal(1);
    expect(existsCalls).to.be.at.least(2);
    expect(parseCalls).to.be.at.least(2);
    expect(httpRequestStub.callCount).to.be.at.least(2);

    debugMock
      .received()
      .log(
        "Failed to contact ntlm-proxy. May just have been removed. Retrying..."
      );
  });
});
