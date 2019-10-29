// cSpell:ignore nisse, mptst
import 'mocha';

import { ExpressServer } from './express.server';
import { ProxyFacade } from './proxy.facade';
import net from 'net';
import http from 'http';
import sinon from 'sinon';
import { expect } from 'chai';
import chai  from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import url from 'url';
import tunnel from 'tunnel';

import { PortsFileService } from '../../src/util/ports.file.service';
import { NtlmConfig } from '../../src/models/ntlm.config.model';
import { PortsFile } from '../../src/models/ports.file.model';
import { ICoreServer } from '../../src/proxy/interfaces/i.core.server';
import { DependencyInjection } from '../../src/proxy/dependency.injection';
import { TYPES } from '../../src/proxy/dependency.injection.types';
import { NtlmSsoConfig } from '../../src/models/ntlm.sso.config.model';
import { osSupported } from 'win-sso';

let configApiUrl: string;
let ntlmProxyUrl: string;
let httpsUrl: string;
let savePortsFileStub: sinon.SinonStub<[PortsFile], Promise<void>>;
let portsFileExistsStub: sinon.SinonStub<[], boolean>;

describe('Proxy for HTTPS host with NTLM', function() {
  let ntlmHostConfig: NtlmConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before('Start HTTPS server and proxy', async function () {
    savePortsFileStub = sinon.stub(PortsFileService.prototype, 'save');
    portsFileExistsStub = sinon.stub(PortsFileService.prototype, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub.returns(Promise.resolve());

    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl = await expressServer.startHttpsServer(true, undefined);
    ntlmHostConfig = {
      ntlmHost: httpsUrl,
      username: 'nisse',
      password: 'manpower',
      domain: 'mptst',
      ntlmVersion: 2
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(false, undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after('Stop HTTPS server and proxy', async function() {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }
    await coreServer.stop(true);
    await expressServer.stopHttpsServer();
  });

  beforeEach('Reset NTLM config', async function() {
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it('should handle authentication for GET requests', async function() {
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, 'ntlm-config should return 200').to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, proxyFacade.mitmCaCert);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal('Expecting larger payload on GET');
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should return 401 for unconfigured host on GET requests', async function() {
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, expressServer.caCert);
    expect(res.status, 'remote request should return 401').to.be.equal(401);
  });

  it('should handle authentication for POST requests', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, 'ntlm-config should return 200').to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'POST', '/post', body, proxyFacade.mitmCaCert);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should return 401 for unconfigured host on POST requests', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'POST', '/post', body, expressServer.caCert);
    expect(res.status, 'remote request should return 401').to.be.equal(401);
  });

  it('should handle authentication for PUT requests', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, 'ntlm-config should return 200').to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'PUT', '/put', body, proxyFacade.mitmCaCert);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should return 401 for unconfigured host on PUT requests', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'PUT', '/put', body, expressServer.caCert);
    expect(res.status, 'remote request should return 401').to.be.equal(401);
  });

  it('should handle authentication for DELETE requests', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig);
    expect(res.status, 'ntlm-config should return 200').to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'DELETE', '/delete', body, proxyFacade.mitmCaCert);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should return 401 for unconfigured host on DELETE requests', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'DELETE', '/delete', body, expressServer.caCert);
    expect(res.status, 'remote request should return 401').to.be.equal(401);
  });
});

describe('Proxy for HTTPS host with NTLM using SSO', function() {
  let ntlmSsoConfig: NtlmSsoConfig;
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before('Start HTTPS server and proxy', async function () {
    // Check SSO support
    if (osSupported() === false) {
      this.skip();
      return;
    }

    savePortsFileStub = sinon.stub(PortsFileService.prototype, 'save');
    portsFileExistsStub = sinon.stub(PortsFileService.prototype, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub.returns(Promise.resolve());

    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl = await expressServer.startHttpsServer(true, undefined);

    ntlmSsoConfig = {
      ntlmHosts: ['localhost']
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(false, undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after('Stop HTTPS server and proxy', async function() {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }
    if (coreServer) {
      await coreServer.stop(true);
      await expressServer.stopHttpsServer();
    }
  });

  beforeEach('Reset NTLM config', async function() {
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it('should handle authentication for GET requests', async function() {
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status, 'ntlm-sso-config should return 200').to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, proxyFacade.mitmCaCert);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal('Expecting larger payload on GET');
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should return 401 for unconfigured host on GET requests', async function() {
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, expressServer.caCert);
    expect(res.status, 'remote request should return 401').to.be.equal(401);
  });

  it('should handle authentication for POST requests', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendNtlmSsoConfig(configApiUrl, ntlmSsoConfig);
    expect(res.status, 'ntlm-sso-config should return 200').to.be.equal(200);
    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'POST', '/post', body, proxyFacade.mitmCaCert);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });
});

describe('Proxy for HTTPS host without NTLM', function() {
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;
  let dependencyInjection = new DependencyInjection();

  before('Start HTTPS server and proxy', async function () {
    savePortsFileStub = sinon.stub(PortsFileService.prototype, 'save');
    portsFileExistsStub = sinon.stub(PortsFileService.prototype, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub.returns(Promise.resolve());

    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl = await expressServer.startHttpsServer(false, undefined);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(false, undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after('Stop HTTPS server and proxy', async function() {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }
    await coreServer.stop(true);
    await expressServer.stopHttpsServer();
  });

  it('should pass through GET requests for non NTLM host', async function() {
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, expressServer.caCert);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.message).to.be.equal('Expecting larger payload on GET');
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should pass through POST requests for non NTLM host', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'POST', '/post', body, expressServer.caCert);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should pass through PUT requests for non NTLM host', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'PUT', '/put', body, expressServer.caCert);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it('should pass through DELETE requests for non NTLM host', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'DELETE', '/delete', body, expressServer.caCert);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
  });

  it.only('should close SSL tunnels on reset', async function() {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };
    let proxyUrl = url.parse(ntlmProxyUrl);
    // TODO use tunnel agent instead
    let agent1 = tunnel.httpsOverHttp({
      proxy: {
          host: proxyUrl.hostname,
          port: +proxyUrl.port,
          headers: {
            'User-Agent': 'Node',
            'proxy-connection': 'keep-alive'
          }
      },
      ca: [expressServer.caCert]
    });
    let agent2 = tunnel.httpsOverHttp({
      proxy: {
          host: proxyUrl.hostname,
          port: +proxyUrl.port,
          headers: {
            'User-Agent': 'Node',
            'proxy-connection': 'keep-alive'
          }
      },
      ca: [expressServer.caCert]
    });
    //let agent1 = new https.Agent({ keepAlive: true });
    //let agent2 = new https.Agent({ keepAlive: true });

    let res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'POST', '/post', body, expressServer.caCert, agent1);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    let resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');

    res = await ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'POST', '/post', body, expressServer.caCert, agent2);
    expect(res.status, 'remote request should return 200').to.be.equal(200);
    resBody = res.data as any;
    expect(resBody.ntlmHost).to.be.equal(body.ntlmHost);
    expect(resBody.reply).to.be.equal('OK ÅÄÖéß');

    console.log(agent1.sockets);
    console.log(agent2.sockets);
    destroySockets(agent1);

    await ProxyFacade.sendNtlmReset(configApiUrl);
    await waitForAgentSocketClose(agent2);
    // TODO should not need to close agent2
    //agent2.destroy();
  });

  function destroySockets(agent: http.Agent) {
    let sockets = agent.sockets as any as net.Socket[];
    sockets.forEach(socket => {
      socket.destroy();
    });
    /*
    for (let property in agent.sockets) {
      if (agent.sockets.hasOwnProperty(property)) {
        agent.sockets[property].forEach(socket => {
          socket.destroy();
        });
      }
    }
    */
  }

  function waitForAgentSocketClose(agent: http.Agent): Promise<void> {
    return new Promise((resolve, reject) => {
      let socketCount = 0;
      let socketProperty;
      let sockets = agent.sockets as any as net.Socket[];
      socketCount = sockets.length;
      /*
      for (let property in agent.sockets) {
        if (agent.sockets.hasOwnProperty(property)) {
          socketCount++;
          socketProperty = property;
        }
      }*/
      console.log(sockets);
      console.log(sockets[0]);

      if (socketCount > 1) {
        return reject(new Error('too many sockets'));
      }
      if (socketCount < 1) {
        return reject(new Error('no sockets'));
      }

      sockets[0].on('finish', () => {
        return resolve();
      });
/*
      agent.sockets[socketProperty][0].on('finish', () => {
        return resolve();
      });
      */
    });
  }
});
