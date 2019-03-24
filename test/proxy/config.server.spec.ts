// cSpell:ignore nisse, mnpwr, mptest
import 'reflect-metadata';
import 'mocha';

//const proxyFacade = require('./proxyFacade');
import { ProxyFacade } from './proxy.facade';
import { expect } from 'chai';
import { Container } from 'inversify';
import { ConfigServer } from '../../src/proxy/config.server';
import { ConfigStore } from '../../src/proxy/config.store';
import { toCompleteUrl } from '../../src/util/url.converter';


describe('Config API', () => {
  let configApiUrl: string;
  let dependencyInjection = new Container({ autoBindInjectable: true, defaultScope: "Singleton" });
  let configServer: ConfigServer;
  let configStore: ConfigStore;

  before(async function () {
    configServer = dependencyInjection.get(ConfigServer);
    configStore = dependencyInjection.get(ConfigStore);
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
    expect(configStore.exists(toCompleteUrl('http://localhost:5000', false))).to.be.false
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
    expect(configStore.exists(toCompleteUrl('http://localhost:5000', false))).to.be.false
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
    expect(configStore.exists(toCompleteUrl('http://localhost:5000', false))).to.be.false
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
    expect(configStore.exists(toCompleteUrl('http://localhost:5000', false))).to.be.true
  });
});
