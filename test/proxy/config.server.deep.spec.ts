// cSpell:ignore nisse, mnpwr, mptest
import 'mocha';

//const proxyFacade = require('./proxyFacade');
import { ProxyFacade } from './proxy.facade';
import { expect } from 'chai';
import { ConfigServer } from '../../src/proxy/config.server';
import { ConfigStore } from '../../src/proxy/config.store';
import { toCompleteUrl } from '../../src/util/url.converter';
import { DependencyInjection } from '../../src/proxy/dependency.injection';
import { TYPES } from '../../src/proxy/dependency.injection.types';

describe('Config API (ConfigServer deep tests)', () => {
  let configApiUrl: string;
  let dependencyInjection = new DependencyInjection();
  let configServer: ConfigServer;
  let configStore: ConfigStore;

  before(async function () {
    configServer = dependencyInjection.get(TYPES.IConfigServer);
    configStore = dependencyInjection.get(TYPES.IConfigStore);
    configServer.init();
    configApiUrl = await configServer.start();
  });

  beforeEach(function () {
    configStore.clear();
  });

  after(async function () {
    await configServer.stop();
  });

  it('ntlm-config should return bad request if the username contains backslash', async function () {
    // Arrange
    let hostConfig = {
      ntlmHost: 'http://localhost:5000',
      username: 'nisse\\nisse',
      password: 'dummy',
      domain: 'mptest'
    };

    // Act
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
    expect(res.status).to.equal(400);
    expect(res.data).to.equal('Config parse error. Username contains invalid characters or is too long.');
    expect(configStore.exists(toCompleteUrl('http://localhost:5000', false))).to.be.false;
  });

  it('ntlm-config should return bad request if the domain contains backslash', async function () {
    // Arrange
    let hostConfig = {
      ntlmHost: 'http://localhost:5000',
      username: 'nisse',
      password: 'dummy',
      domain: 'mptest\\mptest'
    };

    // Act
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
    expect(res.status).to.equal(400);
    expect(res.data).to.equal('Config parse error. Domain contains invalid characters or is too long.');
    expect(configStore.exists(toCompleteUrl('http://localhost:5000', false))).to.be.false;
  });

  it('ntlm-config should return bad request if the ntlmHost includes a path', async function () {
    // Arrange
    let hostConfig = {
      ntlmHost: 'http://localhost:5000/search',
      username: 'nisse',
      password: 'dummy',
      domain: 'mptest'
    };

    // Act
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
    expect(res.status).to.equal(400);
    expect(res.data).to.equal('Config parse error. Invalid ntlmHost, must not contain any path or query (https://www.google.com is ok, https://www.google.com/search is not ok)');
    expect(configStore.exists(toCompleteUrl('http://localhost:5000', false))).to.be.false;
  });

  it('ntlm-config should return ok if the config is ok', async function () {
    // Arrange
    let hostConfig = {
      ntlmHost: 'http://localhost:5000/',
      username: 'nisse',
      password: 'dummy',
      domain: 'mptest'
    };

    // Act
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
    expect(res.status).to.equal(200);
    expect(res.data).to.equal('OK');
    expect(configStore.exists(toCompleteUrl('http://localhost:5000', false))).to.be.true;
  });

  it('ntlm-config should allow reconfiguration', async function () {
    // Arrange
    let hostConfig = {
      ntlmHost: 'http://localhost:5000/',
      username: 'nisse',
      password: 'dummy',
      domain: 'mptest'
    };
    let completeUrl = toCompleteUrl('http://localhost:5000', false);

    // Act
    let res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
    expect(res.status).to.equal(200);
    expect(res.data).to.equal('OK');
    expect(configStore.exists(completeUrl)).to.be.true;
    expect(configStore.get(completeUrl).username).to.be.equal('nisse');

    hostConfig.username = 'dummy';
    res = await ProxyFacade.sendNtlmConfig(configApiUrl, hostConfig);
    expect(res.status).to.equal(200);
    expect(res.data).to.equal('OK');
    expect(configStore.exists(completeUrl)).to.be.true;
    expect(configStore.get(completeUrl).username).to.be.equal('dummy');
  });

  it('alive should return response', async function () {
    // Act
    let res = await ProxyFacade.sendAliveRequest(configApiUrl);
    expect(res.status).to.equal(200);
    expect(res.data).to.equal('OK');
  });
});
