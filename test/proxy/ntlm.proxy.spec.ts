import 'reflect-metadata';
import 'mocha';

import sinon from 'sinon';
import { expect } from 'chai';
import chai  from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

import url from 'url';
import axios, { AxiosRequestConfig } from 'axios';

//const express = require('express');
//const bodyParser = require('body-parser');
const isPortReachable = require('is-port-reachable');
import { Container } from 'inversify';

import { PortsFileService } from '../../src/util/ports.file.service';
import { ProxyFacade } from './proxy.facade';

import { CoreServer } from '../../src/proxy/core.server';
import { PortsFile } from '../../src/models/ports.file.model';

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

/*
const remoteHost = express();
let remoteHostRequestHeaders;
let remoteHostResponseWwwAuthHeader;
let remoteHostReply;
let remoteHostListener;
let remoteHostWithPort;

function initRemoteHost(callback) {
  remoteHost.use(bodyParser.raw());
  remoteHostReply = 401;
  remoteHost.use((req, res) => {
    remoteHostRequestHeaders.push(req.headers);
    if (remoteHostResponseWwwAuthHeader) {
      res.setHeader('www-authenticate', remoteHostResponseWwwAuthHeader);
    }
    res.sendStatus(remoteHostReply);
  });
  remoteHostListener = remoteHost.listen((err) => {
    if (err) {
      return callback(err);
    }
    remoteHostWithPort = 'http://localhost:' + remoteHostListener.address().port;
    return callback();
  });
}

describe('NTLM Proxy authentication', function () {
  let savePortsFileStub;
  let portsFileExistsStub;

  before(function (done) {
    this.timeout(15000);
    proxyFacade.initMitmProxy((err) => {
      if (err) {
        return done(err);
      }
      initRemoteHost(done);
    });
    savePortsFileStub = sinon.stub(portsFile, 'save');
    portsFileExistsStub = sinon.stub(portsFile, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub.callsFake(function (ports, callback) {
      return callback();
    });
  });

  beforeEach(function () {
    _configApiUrl = null;
    remoteHostRequestHeaders = new Array();
    remoteHostResponseWwwAuthHeader = null;
  });

  afterEach(function (done) {
    if (_configApiUrl) {
      // Shutdown the proxy listeners to allow a clean exit
      proxyFacade.sendQuitCommand(_configApiUrl, true, (err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
    }
    if (!_configApiUrl) {
      return done();
    }
  });

  after(function () {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }
    remoteHostListener.close();
  });

  it('proxy without configuration shall not add authentication header', function (done) {
    // Act
    proxy.startProxy(null, null, null, false, false, (result, err) => {
      if (err) {
        return done(err);
      }
      _configApiUrl = result.configApiUrl;
      proxyFacade.sendRemoteRequest(result.ntlmProxyUrl, remoteHostWithPort, 'GET', '/test', null,
        (res, err) => {
          if (err) {
            return done(err);
          }

          // Assert
          assert.equal(res.statusCode, 401);
          let firstRequestHeaders = remoteHostRequestHeaders.shift();
          assert.equal('authorization' in firstRequestHeaders, false);
          done();
        });
    });
  });

  it('proxy with configuration shall add authentication header', function (done) {
    // Arrange
    const hostConfig = {
      ntlmHost: remoteHostWithPort,
      username: 'nisse',
      password: 'manpower',
      domain: 'mnpwr',
    };
    remoteHostResponseWwwAuthHeader = 'test';

    // Act
    proxy.startProxy(null, null, null, false, false, (result, err) => {
      // Assert
      if (err) {
        return done(err);
      }
      _configApiUrl = result.configApiUrl;
      proxyFacade.sendNtlmConfig(result.configApiUrl, hostConfig,
        (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(res.statusCode, 200);
        proxyFacade.sendRemoteRequest(
          result.ntlmProxyUrl,
          remoteHostWithPort,
          'GET',
          '/test',
          null,
          (res, err) => {
            if (err) {
              return done(err);
            }

            // Assert
            assert.equal(res.statusCode, 401);
            let firstRequestHeaders = remoteHostRequestHeaders.shift();
            assert.equal('authorization' in firstRequestHeaders, true);
            done();
          });
      });
    });
  });

  it('proxy with configuration shall not add authentication header for another host', function (done) {
    // Arrange
    const hostConfig = {
      ntlmHost: 'http://some.other.host.com:4567',
      username: 'nisse',
      password: 'manpower',
      domain: 'mnpwr',
    };

    // Act
    proxy.startProxy(null, null, null, false, false, (result, err) => {
      if (err) {
        return done(err);
      }
      _configApiUrl = result.configApiUrl;
      proxyFacade.sendNtlmConfig(result.configApiUrl, hostConfig,
        (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(res.statusCode, 200);
        proxyFacade.sendRemoteRequest(result.ntlmProxyUrl, remoteHostWithPort, 'GET', '/test', null,
        (res, err) => {
          if (err) {
            return done(err);
          }

          // Assert
          assert.equal(res.statusCode, 401);
          let firstRequestHeaders = remoteHostRequestHeaders.shift();
          assert.equal('authorization' in firstRequestHeaders, false);
          done();
        });
      });
    });
  });

  it('proxy shall not add authentication header after reset', function (done) {
    // Arrange
    const hostConfig = {
      ntlmHost: remoteHostWithPort,
      username: 'nisse',
      password: 'manpower',
      domain: 'mnpwr',
    };

    // Act
    proxy.startProxy(null, null, null, false, false, (result, err) => {
      if (err) {
        return done(err);
      }
      _configApiUrl = result.configApiUrl;
      proxyFacade.sendNtlmConfig(result.configApiUrl, hostConfig,
        (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(res.statusCode, 200);
        proxyFacade.sendNtlmReset(result.configApiUrl, (err) => {
          if (err) {
            return done(err);
          }
          proxyFacade.sendRemoteRequest(result.ntlmProxyUrl, remoteHostWithPort, 'GET', '/test', null,
          (res, err) => {
            if (err) {
              return done(err);
            }

            // Assert
            assert.equal(res.statusCode, 401);
            let firstRequestHeaders = remoteHostRequestHeaders.shift();
            assert.equal('authorization' in firstRequestHeaders, false);
            done();
          });
        });
      });
    });
  });
});
*/

