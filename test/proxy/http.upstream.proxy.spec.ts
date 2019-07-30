// cSpell:ignore nisse, mptst
import 'mocha';

import { ExpressServer } from './express.server';
import { ProxyFacade } from './proxy.facade';

import sinon from 'sinon';
import { expect } from 'chai';
import chai  from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import { Container } from 'inversify';

import { CoreServer } from '../../src/proxy/core.server';
import { PortsFileService } from '../../src/util/ports.file.service';
import { NtlmConfig } from '../../src/models/ntlm.config.model';
import { PortsFile } from '../../src/models/ports.file.model';
import { DependencyInjection } from '../../src/proxy/dependency.injection';
import { ICoreServer } from '../../src/proxy/interfaces/i.core.server';
import { TYPES } from '../../src/proxy/dependency.injection.types';

let configApiUrl: string;
let ntlmProxyUrl: string;
let httpUrl: string;
let savePortsFileStub: sinon.SinonStub<[PortsFile], Promise<void>>;
let portsFileExistsStub: sinon.SinonStub<[], boolean>;
let upstreamProxyUrl: string;
let upstreamProxyReqCount: number;

describe('Proxy for HTTP host with NTLM and upstream proxy', function() {
  let ntlmHostConfig: NtlmConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before('Start HTTP server and proxy', async function () {
    savePortsFileStub = sinon.stub(PortsFileService.prototype, 'save');
    portsFileExistsStub = sinon.stub(PortsFileService.prototype, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub.returns(Promise.resolve());

    this.timeout(15000);
    upstreamProxyUrl = await proxyFacade.startMitmProxy(false, function (ctx, callback) {
      upstreamProxyReqCount++;
      return callback();
    });
    httpUrl = await expressServer.startHttpServer(true, undefined);
    ntlmHostConfig = {
      ntlmHost: httpUrl,
      username: 'nisse',
      password: 'manpower',
      domain: 'mptst',
      ntlmVersion: 2
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(false, upstreamProxyUrl, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after('Stop HTTP server and proxy', async function() {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }
    await coreServer.stop(true);
    proxyFacade.stopMitmProxy();
    await expressServer.stopHttpServer();
  });

  beforeEach('Reset NTLM config', async function() {
    await ProxyFacade.sendNtlmReset(configApiUrl);
    upstreamProxyReqCount = 0;
  });


  it('should handle authentication for GET requests', async function() {
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, 'ntlm-config should return 200').to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null);
    expect(upstreamProxyReqCount, 'should be three requests due to handshake').to.be.equal(3);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal('Expecting larger payload on GET');
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should return 401 for unconfigured host on GET requests', async function() {
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null);
    expect(upstreamProxyReqCount, 'should be one requests').to.be.equal(1);
    expect(res.status, 'remote request should return 401').to.be.equal(401);
  });

  it('should handle authentication for POST requests', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, 'ntlm-config should return 200').to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'POST', '/post', body);
    expect(upstreamProxyReqCount, 'should be three requests due to handshake').to.be.equal(3);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should return 401 for unconfigured host on POST requests', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'POST', '/post', body);
    expect(upstreamProxyReqCount, 'should be one requests').to.be.equal(1);
    expect(res.status, 'remote request should return 401').to.be.equal(401);
  });

  it('should handle authentication for PUT requests', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, 'ntlm-config should return 200').to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'PUT', '/put', body);
    expect(upstreamProxyReqCount, 'should be three requests due to handshake').to.be.equal(3);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should return 401 for unconfigured host on PUT requests', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'PUT', '/put', body);
    expect(upstreamProxyReqCount, 'should be one requests').to.be.equal(1);
    expect(res.status, 'remote request should return 401').to.be.equal(401);
  });

  it('should handle authentication for DELETE requests', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, 'ntlm-config should return 200').to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'DELETE', '/delete', body);
    expect(upstreamProxyReqCount, 'should be three requests due to handshake').to.be.equal(3);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should return 401 for unconfigured host on DELETE requests', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'DELETE', '/delete', body);
    expect(upstreamProxyReqCount, 'should be one requests').to.be.equal(1);
    expect(res.status, 'remote request should return 401').to.be.equal(401);
  });
});

describe('Proxy for HTTP host without NTLM and upstream proxy', function() {
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before('Start HTTP server and proxy', async function () {
    savePortsFileStub = sinon.stub(PortsFileService.prototype, 'save');
    portsFileExistsStub = sinon.stub(PortsFileService.prototype, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub.returns(Promise.resolve());

    this.timeout(15000);
    upstreamProxyUrl = await proxyFacade.startMitmProxy(false, function (ctx, callback) {
      upstreamProxyReqCount++;
      return callback();
    });
    httpUrl = await expressServer.startHttpServer(false, undefined);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(false, upstreamProxyUrl, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after('Stop HTTP server and proxy', async function() {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }
    await coreServer.stop(true);
    proxyFacade.stopMitmProxy();
    await expressServer.stopHttpServer();
  });

  beforeEach('Reset upstream req count', function() {
    upstreamProxyReqCount = 0;
  });

  it('should pass through GET requests for non NTLM host', async function() {
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null);
    expect(upstreamProxyReqCount, 'should be one request').to.be.equal(1);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal('Expecting larger payload on GET');
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should pass through POST requests for non NTLM host', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'POST', '/post', body);
    expect(upstreamProxyReqCount, 'should be one request').to.be.equal(1);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should pass through PUT requests for non NTLM host', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'PUT', '/put', body);
    expect(upstreamProxyReqCount, 'should be one request').to.be.equal(1);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should pass through DELETE requests for non NTLM host', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'DELETE', '/delete', body);
    expect(upstreamProxyReqCount, 'should be one request').to.be.equal(1);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });
});

describe('Proxy for HTTP host without NTLM, upstream proxy + NO_PROXY', function() {
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before('Start HTTP server', async function () {
    savePortsFileStub = sinon.stub(PortsFileService.prototype, 'save');
    portsFileExistsStub = sinon.stub(PortsFileService.prototype, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub.returns(Promise.resolve());

    this.timeout(15000);
    upstreamProxyUrl = await proxyFacade.startMitmProxy(false, function (ctx, callback) {
      upstreamProxyReqCount++;
      return callback();
    });
    httpUrl = await expressServer.startHttpServer(false, undefined);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
  });

  afterEach('Stop proxy', async function() {
    await coreServer.stop(true);
  });

  after('Stop HTTP server', async function() {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }

    httpUrl = '';
    proxyFacade.stopMitmProxy();
    await expressServer.stopHttpServer();
  });

  beforeEach('Reset upstream req count', function() {
    upstreamProxyReqCount = 0;
  });

  it('should not use upstream proxy for http host when only https upstream proxy is defined', async function() {
    let ports = await coreServer.start(false, undefined, upstreamProxyUrl, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null);
    expect(upstreamProxyReqCount, 'should not pass through upstream proxy').to.be.equal(0);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal('Expecting larger payload on GET');
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should not use upstream proxy with NO_PROXY localhost', async function() {
    let ports = await coreServer.start(false, upstreamProxyUrl, undefined, 'localhost');
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null);
    expect(upstreamProxyReqCount, 'should not pass through upstream proxy').to.be.equal(0);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal('Expecting larger payload on GET');
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should not use upstream proxy with NO_PROXY *host', async function() {
    let ports = await coreServer.start(false, upstreamProxyUrl, undefined, '*host');
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null);
    expect(upstreamProxyReqCount, 'should not pass through upstream proxy').to.be.equal(0);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal('Expecting larger payload on GET');
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should not use upstream proxy with NO_PROXY local*', async function() {
    let ports = await coreServer.start(false, upstreamProxyUrl, undefined, 'local*');
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null);
    expect(upstreamProxyReqCount, 'should not pass through upstream proxy').to.be.equal(0);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal('Expecting larger payload on GET');
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should not use upstream proxy with NO_PROXY *', async function() {
    let ports = await coreServer.start(false, upstreamProxyUrl, undefined, '*');
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null);
    expect(upstreamProxyReqCount, 'should not pass through upstream proxy').to.be.equal(0);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal('Expecting larger payload on GET');
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should use upstream proxy with NO_PROXY google.com', async function() {
    let ports = await coreServer.start(false, upstreamProxyUrl, undefined, 'google.com');
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null);
    expect(upstreamProxyReqCount, 'should pass through upstream proxy').to.be.equal(1);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal('Expecting larger payload on GET');
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });
});
