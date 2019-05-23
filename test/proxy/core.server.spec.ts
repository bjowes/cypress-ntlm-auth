import 'mocha';

import sinon from 'sinon';
import { expect } from 'chai';
import chai  from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

import url from 'url';
import axios, { AxiosRequestConfig } from 'axios';

const isPortReachable = require('is-port-reachable');

import { PortsFileService } from '../../src/util/ports.file.service';
import { ProxyFacade } from './proxy.facade';

import { PortsFile } from '../../src/models/ports.file.model';
import { DependencyInjection } from '../../src/proxy/dependency.injection';
import { ICoreServer } from '../../src/proxy/interfaces/i.core.server';
import { TYPES } from '../../src/proxy/dependency.injection.types';

async function isProxyReachable(ports: PortsFile): Promise<boolean> {
  const configUrl = url.parse(ports.configApiUrl);
  const proxyUrl = url.parse(ports.ntlmProxyUrl);

  let reachable = await isPortReachable(proxyUrl.port, { host: proxyUrl.hostname });
  if (!reachable) {
    return false;
  }
  reachable = await isPortReachable(configUrl.port, { host: configUrl.hostname });
  if (!reachable) {
    return false;
  }
  return true;
}

describe('Core server startup and shutdown', () => {
  let savePortsFileStub: sinon.SinonStub<[PortsFile], Promise<void>>;
  let portsFileExistsStub: sinon.SinonStub<[], boolean>;
  let parsePortsFileStub: sinon.SinonStub<[], PortsFile>;
  let deletePortsFileStub: sinon.SinonStub<[], Promise<void>>;
  let httpRequestStub: sinon.SinonStub<[string, any?, (AxiosRequestConfig | undefined)?], Promise<{}>>;
  let proxyFacade = new ProxyFacade();
  let dependencyInjection = new DependencyInjection();
  let coreServer: ICoreServer;
  let _configApiUrl: string | undefined;

  before(async function () {
    this.timeout(15000);
    await proxyFacade.initMitmProxy();
  });

  beforeEach(function () {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    savePortsFileStub = sinon.stub(PortsFileService.prototype, 'save');
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }
    portsFileExistsStub = sinon.stub(PortsFileService.prototype, 'exists');
    if (parsePortsFileStub) {
      parsePortsFileStub.restore();
    }
    parsePortsFileStub = sinon.stub(PortsFileService.prototype, 'parse');
    if (deletePortsFileStub) {
      deletePortsFileStub.restore();
    }
    deletePortsFileStub = sinon.stub(PortsFileService.prototype, 'delete');

    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    _configApiUrl = undefined;
  });

  afterEach(async function () {
    if (httpRequestStub) {
      httpRequestStub.restore();
    }
    if (_configApiUrl) {
      // Shutdown the proxy listeners to allow a clean exit
      await coreServer.stop(false);
    }
  });

  after(function () {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }
    if (parsePortsFileStub) {
      parsePortsFileStub.restore();
    }
    if (deletePortsFileStub) {
      deletePortsFileStub.restore();
    }
  });

  it('starting proxy should fail if portsFile cannot be saved', async function () {
    // Arrange
    portsFileExistsStub.returns(false);
    savePortsFileStub.throws(new Error('Cannot create file'));

    // Act
    await expect(coreServer.start(false, undefined, undefined, undefined)).to.be.rejectedWith('Cannot create file');
    expect(portsFileExistsStub.calledOnce).to.be.true;
    expect(savePortsFileStub.calledOnce).to.be.true;
  });

  it('starting proxy should write portsFile', async function () {
    // Arrange
    portsFileExistsStub.returns(false);
    let savedData: PortsFile = {
      ntlmProxyUrl: '',
      configApiUrl: ''
    };
    savePortsFileStub.callsFake(function (ports: PortsFile) {
      savedData = ports;
      return Promise.resolve();
    });

    // Act
    let ports = await coreServer.start(false, undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;

    expect(savedData.ntlmProxyUrl).to.be.equal(ports.ntlmProxyUrl);
    expect(savedData.configApiUrl).to.be.equal(ports.configApiUrl);
    expect(portsFileExistsStub.calledOnce).to.be.true;
    expect(savePortsFileStub.calledOnce).to.be.true;
    let reachable = await isProxyReachable(savedData);
    expect(reachable, 'Proxy should be reachable').to.be.true;
  });

  it('restarting proxy should terminate old proxy', async function () {
    // Arrange
    portsFileExistsStub.returns(true);
    const oldProxy: PortsFile = {
      ntlmProxyUrl: 'http://localhost:6666',
      configApiUrl: 'http://localhost:7777'
    };
    parsePortsFileStub.returns(oldProxy);
    savePortsFileStub.returns(Promise.resolve());
    deletePortsFileStub.returns(Promise.resolve());
    httpRequestStub = sinon.stub(axios, 'post');

    let callUrl = '';
    let callBody = {};
    let callOptions = {};
    httpRequestStub.callsFake((url: string, body: any, options: any) => {
      callUrl = url;
      callBody = body;
      callOptions = options;
      return Promise.resolve({});
    });

    let ports = await coreServer.start(false, undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;

    expect(httpRequestStub.calledOnce).to.be.true;
    expect(callUrl).to.be.equal(oldProxy.configApiUrl + '/quit');
    expect(callBody).to.be.deep.equal({ keepPortsFile: true });
    expect(callOptions).to.be.deep.equal({ timeout: 15000 });
    expect(portsFileExistsStub.calledOnce).to.be.true;
    expect(parsePortsFileStub.calledOnce).to.be.true;
    expect(deletePortsFileStub.calledOnce).to.be.true;
    expect(savePortsFileStub.calledOnce).to.be.true;
  });

  it('quit command shuts down the proxy, keep portsFile', async function () {
    // Arrange
    portsFileExistsStub.returns(false);
    savePortsFileStub.returns(Promise.resolve());
    deletePortsFileStub.returns(Promise.resolve());

    // Act
    let ports = await coreServer.start(false, undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;

    expect(portsFileExistsStub.calledOnce).to.be.true;
    expect(savePortsFileStub.calledOnce).to.be.true;

    await ProxyFacade.sendQuitCommand(ports.configApiUrl, true);
    _configApiUrl = undefined;

    expect(deletePortsFileStub.notCalled).to.be.true;
    let reachable = await isProxyReachable(ports);
    expect(reachable, 'Proxy should not be reachable').to.be.false;
  });

  it('quit command shuts down the proxy, delete portsFile', async function () {
    // Arrange
    portsFileExistsStub.returns(false);
    savePortsFileStub.returns(Promise.resolve());
    deletePortsFileStub.returns(Promise.resolve());

    // Act
    let ports = await coreServer.start(false, undefined, undefined, undefined);
    _configApiUrl = ports.configApiUrl;

    expect(portsFileExistsStub.calledOnce).to.be.true;
    expect(savePortsFileStub.calledOnce).to.be.true;

    await ProxyFacade.sendQuitCommand(ports.configApiUrl, false);
    _configApiUrl = undefined;

    expect(deletePortsFileStub.calledOnce).to.be.true;
    let reachable = await isProxyReachable(ports);
    expect(reachable, 'Proxy should not be reachable').to.be.false;
  });
});
