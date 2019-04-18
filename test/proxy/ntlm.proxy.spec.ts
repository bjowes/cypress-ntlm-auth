// cSpell:ignore nisse, mnpwr

import 'mocha';

import sinon from 'sinon';
import { expect } from 'chai';

import http from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import { Container } from 'inversify';

import { PortsFileService } from '../../src/util/ports.file.service';
import { ProxyFacade } from './proxy.facade';

import { CoreServer } from '../../src/proxy/core.server';
import { PortsFile } from '../../src/models/ports.file.model';
import { AddressInfo } from 'net';
import { NtlmConfig } from '../../src/models/ntlm.config.model';
import { DependencyInjection } from '../../src/proxy/dependency.injection';
import { ICoreServer } from '../../src/proxy/interfaces/i.core.server';
import { TYPES } from '../../src/proxy/dependency.injection.types';

let _configApiUrl: string | undefined;

let remoteHost = express();
let remoteHostRequestHeaders: http.IncomingHttpHeaders[];
let remoteHostResponseWwwAuthHeader: string | undefined;
let remoteHostReply: number;
let remoteHostListener: http.Server | undefined;
let remoteHostWithPort: string;

async function initRemoteHost() {
  remoteHost.use(bodyParser.raw());
  remoteHostReply = 401;
  remoteHost.use((req, res) => {
    remoteHostRequestHeaders.push(req.headers);
    if (remoteHostResponseWwwAuthHeader) {
      res.setHeader('www-authenticate', remoteHostResponseWwwAuthHeader);
    }
    res.sendStatus(remoteHostReply);
  });

  remoteHostListener = await new Promise<http.Server>((resolve, reject) => {
    let listener = remoteHost.listen(null, (err: Error) => {
      if (err) {
        reject(err);
      }
    });
    resolve(listener);
  });
  if (remoteHostListener) {
    let addressInfo = remoteHostListener.address() as AddressInfo;
    remoteHostWithPort = 'http://localhost:' + addressInfo.port;
  } else {
    throw new Error('Could not start test server');
  }
}

describe('NTLM Proxy authentication', function () {
  let savePortsFileStub: sinon.SinonStub<[PortsFile], Promise<void>>;
  let portsFileExistsStub: sinon.SinonStub<[], boolean>;
  let proxyFacade = new ProxyFacade();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before(async function () {
    this.timeout(15000);
    await proxyFacade.initMitmProxy();
    await initRemoteHost();
    savePortsFileStub = sinon.stub(PortsFileService.prototype, 'save');
    portsFileExistsStub = sinon.stub(PortsFileService.prototype, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub.returns(Promise.resolve());
  });

  beforeEach(function () {
    coreServer = dependencyInjection.get(TYPES.ICoreServer);
    _configApiUrl = undefined;
    remoteHostRequestHeaders = [];
    remoteHostResponseWwwAuthHeader = undefined;
  });

  afterEach(async function () {
    if (_configApiUrl) {
      // Shutdown the proxy listeners to allow a clean exit
      await ProxyFacade.sendQuitCommand(_configApiUrl, true);
      _configApiUrl = undefined;
    }
  });

  after(function () {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }
    if (remoteHostListener) {
      remoteHostListener.close();
    }
  });

  it('proxy without configuration shall not add authentication header', async function () {
    // Act
    let ports = await coreServer.start(false, undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;
    let res = await ProxyFacade.sendRemoteRequest(ports.ntlmProxyUrl, remoteHostWithPort, 'GET', '/test', null);
    expect(res.status).to.be.equal(401);
    let firstRequestHeaders = remoteHostRequestHeaders.shift();
    expect(firstRequestHeaders).to.be.not.null;
    expect(firstRequestHeaders && 'authorization' in firstRequestHeaders).to.be.false;
  });

  it('proxy with configuration shall add authentication header', async function () {
    // Arrange
    const hostConfig: NtlmConfig = {
      ntlmHost: remoteHostWithPort,
      username: 'nisse',
      password: 'manpower',
      domain: 'mnpwr',
    };
    remoteHostResponseWwwAuthHeader = 'test';

    // Act
    let ports = await coreServer.start(false, undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;
    let res = await ProxyFacade.sendNtlmConfig(ports.configApiUrl, hostConfig);
    expect(res.status).to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ports.ntlmProxyUrl, remoteHostWithPort, 'GET', '/test', null);
    expect(res.status).to.be.equal(401);
    let firstRequestHeaders = remoteHostRequestHeaders.shift();
    expect(firstRequestHeaders).to.be.not.null;
    expect(firstRequestHeaders && 'authorization' in firstRequestHeaders).to.be.true;
  });

  it('proxy with configuration shall not add authentication header for another host', async function () {
    // Arrange
    const hostConfig: NtlmConfig = {
      ntlmHost: 'http://some.other.host.com:4567',
      username: 'nisse',
      password: 'manpower',
      domain: 'mnpwr',
    };

    // Act
    let ports = await coreServer.start(false, undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;
    let res = await ProxyFacade.sendNtlmConfig(ports.configApiUrl, hostConfig);
    expect(res.status).to.be.equal(200);

    res = await ProxyFacade.sendRemoteRequest(ports.ntlmProxyUrl, remoteHostWithPort, 'GET', '/test', null);
    expect(res.status).to.be.equal(401);
    let firstRequestHeaders = remoteHostRequestHeaders.shift();
    expect(firstRequestHeaders).to.be.not.null;
    expect(firstRequestHeaders && 'authorization' in firstRequestHeaders).to.be.false;
  });

  it('proxy shall not add authentication header after reset', async function () {
    // Arrange
    const hostConfig: NtlmConfig = {
      ntlmHost: remoteHostWithPort,
      username: 'nisse',
      password: 'manpower',
      domain: 'mnpwr',
    };

    // Act
    let ports = await coreServer.start(false, undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;
    let res = await ProxyFacade.sendNtlmConfig(ports.configApiUrl, hostConfig);
    expect(res.status).to.be.equal(200);

    await ProxyFacade.sendNtlmReset(ports.configApiUrl);

    res = await ProxyFacade.sendRemoteRequest(ports.ntlmProxyUrl, remoteHostWithPort, 'GET', '/test', null);
    expect(res.status).to.be.equal(401);
    let firstRequestHeaders = remoteHostRequestHeaders.shift();
    expect(firstRequestHeaders).to.be.not.null;
    expect(firstRequestHeaders && 'authorization' in firstRequestHeaders).to.be.false;
  });

  it('proxy shall return error but keep working after incoming non-proxy request', async function() {
    const hostConfig: NtlmConfig = {
      ntlmHost: remoteHostWithPort,
      username: 'nisse',
      password: 'manpower',
      domain: 'mnpwr',
    };
    let ports = await coreServer.start(false, undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;

    let res = await ProxyFacade.sendNtlmConfig(ports.ntlmProxyUrl, hostConfig, 250);
    expect(res.status).to.be.equal(504);

    res = await ProxyFacade.sendRemoteRequest(ports.ntlmProxyUrl, remoteHostWithPort, 'GET', '/test', null);
    expect(res.status).to.be.equal(401);
  });
});
