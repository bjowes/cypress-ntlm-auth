const assert = require('assert');
const getPath = require('platform-folders');
const path = require('path');
const sinon = require('sinon');

const url = require('url');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const isPortReachable = require('is-port-reachable');
const MitmProxy = require('http-mitm-proxy');
const getPort = require('get-port');

const portsFile = require('../../src/util/portsFile');
const portsFileName = 'cypress-ntlm-auth.port';
const portsFileWithPath = path.join(getPath.getDataHome(), portsFileName);


const proxy = require('../../src/proxy/server');

// The MITM proxy takes a significant time to start the first time due to cert generation,
// so we ensure this is done before the tests are executed to avoid timeouts
let _mitmProxyInit = false;
function initMitmProxy(callback) {
  if (_mitmProxyInit) return callback();

  let mitmProxy = MitmProxy();
  getPort().then((port) => {
    mitmProxy.listen({ host: 'localhost', port: port, keepAlive: false, silent: true, forceSNI: false }, (err) => {
      if (err) {
        return callback(err);
      }
      mitmProxy.close();
      _mitmProxyInit = true;  
      return callback();
    });
  });
}

let _configApiUrl;

function sendQuitCommand(configApiUrl, keepPortsFile, callback) {
  let configApi = url.parse(configApiUrl);
  let quitBody = JSON.stringify({ keepPortsFile: keepPortsFile });
  let quitReq = http.request({
    method: 'POST',
    path: '/quit',
    host: configApi.hostname,
    port: configApi.port,
    timeout: 15000,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'content-length': Buffer.byteLength(quitBody)
    }
  }, function (res) {
    res.resume();
    if (res.statusCode !== 200) {
      return callback(new Error('Unexpected response from NTLM proxy: ' + res.statusCode));
    }
    return callback();
  });
  quitReq.on('error', (err) => {
    return callback(err);
  });
  quitReq.write(quitBody);
  quitReq.end();
}

function isProxyReachable(ports, callback) {
  let configUrl = url.parse(ports.configApiUrl);
  let proxyUrl = url.parse(ports.ntlmProxyUrl);

  isPortReachable(proxyUrl.port, proxyUrl.hostname).then(reachable => {
    if (!reachable) {
      return callback(false, null);
    }
    isPortReachable(configUrl.port, configUrl.hostname).then(reachable => {
      if (!reachable) {
        return callback(false, null);
      }
      return callback(true, null);
    })
    .catch(err => {
      return callback(null, err);
    });  
  })
  .catch(err => {
    return callback(null, err);
  });  
}

describe('Proxy startup and shutdown', () => {
  
  let savePortsFileStub;
  let portsFileExistsStub;
  let parsePortsFileStub;
  let deletePortsFileStub;
  let httpRequestStub;

  before(function(done) {
    this.timeout(15000);
    initMitmProxy(done);
  });

  beforeEach(function() {
    if (savePortsFileStub) { savePortsFileStub.restore(); }
    savePortsFileStub = sinon.stub(portsFile, 'savePortsFile');
    if (portsFileExistsStub) { portsFileExistsStub.restore(); }
    portsFileExistsStub = sinon.stub(portsFile, 'portsFileExists');
    if (parsePortsFileStub) { parsePortsFileStub.restore(); }
    parsePortsFileStub = sinon.stub(portsFile, 'parsePortsFile');
    if (deletePortsFileStub) { deletePortsFileStub.restore(); }
    deletePortsFileStub = sinon.stub(portsFile, 'deletePortsFile');

    _configApiUrl = null;
  });

  afterEach(function(done) {
    if (httpRequestStub) { httpRequestStub.restore(); }
    if (_configApiUrl) {
      sendQuitCommand(_configApiUrl, false, (err) => { // Shutdown the proxy listeners to allow a clean exit
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

  after(function() {
    if (savePortsFileStub) { savePortsFileStub.restore(); }
    if (portsFileExistsStub) { portsFileExistsStub.restore(); }
    if (parsePortsFileStub) { parsePortsFileStub.restore(); }
    if (deletePortsFileStub) { deletePortsFileStub.restore(); }
  });

  it('starting proxy should fail if portsFile cannot be saved', function(done) {
    // Arrange
    portsFileExistsStub.callsFake(function() { return false; });
    savePortsFileStub.callsFake(function(ports, callback) { return callback(new Error('Cannot create ' + portsFileWithPath)); });

    // Act
    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot create ' + portsFileWithPath);
      assert(portsFileExistsStub.calledOnce);
      assert(savePortsFileStub.calledOnce);
      return done();
    });
  });

  it('starting proxy should write portsFile', function(done) {
    // Arrange
    portsFileExistsStub.callsFake(function() { return false; });
    let savedData;
    savePortsFileStub.callsFake(function(ports, callback) { savedData = ports; return callback(); });

    // Act
    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      if (err) {
        return done(err);
      }
      _configApiUrl = result.configApiUrl;
      
      assert.equal('ntlmProxyUrl' in savedData, true);
      assert.equal('configApiUrl' in savedData, true);
      assert.equal(savedData.ntlmProxyUrl, result.ntlmProxyUrl);
      assert.equal(savedData.configApiUrl, result.configApiUrl);
      assert(portsFileExistsStub.calledOnce);
      assert(savePortsFileStub.calledOnce);
      isProxyReachable(savedData, (reachable, err) => {
        if (err) {
          return done(err);
        }
        assert.equal(reachable, true, "Proxy should be reachable");
        return done();
      });
    });
  });

  it('restarting proxy should terminate old proxy', function(done) {
    // Arrange
    portsFileExistsStub.callsFake(function() { return true; });
    let oldProxy = { ntlmProxyUrl: 'http://localhost:6666', configApiUrl: 'http://localhost:7777' };
    parsePortsFileStub.callsFake(function(callback) { return callback(oldProxy); });
    let savedData;
    savePortsFileStub.callsFake(function(ports, callback) { savedData = ports; return callback(); });
    deletePortsFileStub.callsFake(function(callback) { return callback(); });
    httpRequestStub = sinon.stub(http, 'request');
    let clientRequestStub = {
      'on': function() {},
      'end': function() {},
      'write': function() {}
    };
    let incomingResponseStub = {
      'resume': function() {},
      'statusCode': 200
    };
    let quitBody = JSON.stringify({ keepPortsFile: true });
    httpRequestStub.returns(clientRequestStub).callsFake(function(options, callback) { return callback(incomingResponseStub); });

    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      if (err) {
        return done(err);
      }
      _configApiUrl = result.configApiUrl;
      assert(httpRequestStub.calledWith({
        method: 'POST',
        path: '/quit',
        host: 'localhost',
        port: '7777',
        timeout: 15000,
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'content-length': Buffer.byteLength(quitBody)
        }}));
      assert(portsFileExistsStub.calledOnce);
      assert(parsePortsFileStub.calledOnce);
      assert(deletePortsFileStub.calledOnce);
      assert(savePortsFileStub.calledOnce);
      return done();
    });
  });

  it('quit command shuts down the proxy, keep portsFile', function(done) {
    // Arrange
    portsFileExistsStub.callsFake(function() { return false; });
    let savedData;
    savePortsFileStub.callsFake(function(ports, callback) { savedData = ports; return callback(); });
    deletePortsFileStub.callsFake(function(callback) { return callback(); });

    // Act
    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      if (err) {
        return done(err);
      }
      _configApiUrl = result.configApiUrl;
      assert(portsFileExistsStub.calledOnce);
      assert(savePortsFileStub.calledOnce);

      sendQuitCommand(result.configApiUrl, true, (err) => {
        if (err) {
          return done(err);
        }
        _configApiUrl = null;

        assert(deletePortsFileStub.notCalled);

        isProxyReachable(result, (reachable, err) => {
          if (err) {
            return done(err);
          }
          assert.equal(reachable, false, "Proxy should not be reachable");
          return done();
        });
      });
    });
  });

  it('quit command shuts down the proxy, delete portsFile', function(done) {
    // Arrange
    portsFileExistsStub.callsFake(function() { return false; });
    let savedData;
    savePortsFileStub.callsFake(function(ports, callback) { savedData = ports; return callback(); });
    deletePortsFileStub.callsFake(function(callback) { return callback(); });

    // Act
    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      if (err) {
        return done(err);
      }
      _configApiUrl = result.configApiUrl;
      assert(portsFileExistsStub.calledOnce);
      assert(savePortsFileStub.calledOnce);

      sendQuitCommand(result.configApiUrl, false, (err) => {
        if (err) {
          return done(err);
        }
        _configApiUrl = null;

        assert(deletePortsFileStub.calledOnce);

        isProxyReachable(result, (reachable, err) => {
          if (err) {
            return done(err);
          }
          assert.equal(reachable, false, "Proxy should not be reachable");  
          return done();  
        });
      });
    });
  });
});


describe('Proxy authentication', function() {
  let savePortsFileStub;
  let portsFileExistsStub;
  let deletePortsFileStub;
  let remoteHost = express();
  let remoteHostRequestHeaders;
  let remoteHostReply;
  let remoteHostListener;
  let remoteHostWithPort;

  function initRemoteHost(callback) {
    remoteHost.use(bodyParser.raw());
    remoteHostReply = 401;
    remoteHost.use((req, res, next) => {
      remoteHostRequestHeaders = req.headers;
      res.sendStatus(remoteHostReply);
    });
    remoteHostListener = remoteHost.listen((err) => {
      if (err) {
        return callback(err);
      }
      remoteHostWithPort = 'localhost:' + remoteHostListener.address().port;
      return callback();
    });
  }
  
  before(function(done) {
    this.timeout(15000);
    initMitmProxy((err) => {
      if (err) {
        return done(err);
      }
      initRemoteHost(done);
    });
  });

  beforeEach(function() {
    if (savePortsFileStub) { savePortsFileStub.restore(); }
    savePortsFileStub = sinon.stub(portsFile, 'savePortsFile');
    if (portsFileExistsStub) { portsFileExistsStub.restore(); }
    portsFileExistsStub = sinon.stub(portsFile, 'portsFileExists');
    if (deletePortsFileStub) { deletePortsFileStub.restore(); }
    deletePortsFileStub = sinon.stub(portsFile, 'deletePortsFile');
    _configApiUrl = null;
  });

  afterEach(function(done) {
    if (_configApiUrl) {
      sendQuitCommand(_configApiUrl, false, (err) => { // Shutdown the proxy listeners to allow a clean exit
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

  after(function() {
    if (savePortsFileStub) { savePortsFileStub.restore(); }
    if (portsFileExistsStub) { portsFileExistsStub.restore(); }
    if (deletePortsFileStub) { deletePortsFileStub.restore(); }
    remoteHostListener.close();
  });

  it('unconfigured proxy shall not add authentication header', function(done) {
    // Arrange
    portsFileExistsStub.returns(false);
    savePortsFileStub.callsFake(function(ports, callback) { return callback(); });
    deletePortsFileStub.callsFake(function(callback) { return callback(); });

    // Act
    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      if (err) {
        return done(err);
      }
      _configApiUrl = result.configApiUrl;
      let proxyUrl = url.parse(result.ntlmProxyUrl);

      let proxyReq = http.request({
        method: 'GET',
        path:  '/test',
        host: proxyUrl.hostname,
        port: proxyUrl.port,
        timeout: 15000,
        headers: {
          'Host': remoteHostWithPort
        } 
      }, (res) => {
        assert.equal(res.statusCode, 401);
        assert.equal('authorization' in remoteHostRequestHeaders, false);
        done();
      });
      proxyReq.on('error', (err) => {
        return done(err);
      });
      proxyReq.end();
    });
  });

  it('configured proxy shall add authentication header', function(done) {
    // Arrange
    portsFileExistsStub.returns(false);
    savePortsFileStub.callsFake(function(ports, callback) { return callback(); });
    deletePortsFileStub.callsFake(function(callback) { return callback(); });

    // Act
    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      if (err) {
        return done(err);
      }
      _configApiUrl = result.configApiUrl;
      let configUrl = url.parse(result.configApiUrl);
      let hostConfig = {
        ntlmHost: 'http://' + remoteHostWithPort,
        username: 'nisse',
        password: 'manpower',
        domain: 'mnpwr'
      };
      let hostConfigJson = JSON.stringify(hostConfig)
      let configReq = http.request({
        method: 'POST',
        path:  '/ntlm-config',
        host: configUrl.hostname,
        port: configUrl.port,
        timeout: 15000,
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'content-length': Buffer.byteLength(hostConfigJson)
        } 
      }, (res) => {
        assert.equal(res.statusCode, 200);

        let proxyUrl = url.parse(result.ntlmProxyUrl);

        let proxyReq = http.request({
          method: 'GET',
          path:  '/test',
          host: proxyUrl.hostname,
          port: proxyUrl.port,
          timeout: 15000,
          headers: {
            'Host': remoteHostWithPort
          } 
        }, (res) => {
          assert.equal(res.statusCode, 401);
          assert.equal('authorization' in remoteHostRequestHeaders, true);
          done();
        });
        proxyReq.on('error', (err) => {
          return done(err);
        });
        proxyReq.end();  
      });
      configReq.on('error', (err) => {
        return done(err);
      });
      configReq.write(hostConfigJson);
      configReq.end();
    });
  });

  it('configured proxy shall not add authentication header for unconfigured host', function(done) {
    // Arrange
    portsFileExistsStub.returns(false);
    savePortsFileStub.callsFake(function(ports, callback) { return callback(); });
    deletePortsFileStub.callsFake(function(callback) { return callback(); });

    // Act
    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      if (err) {
        return done(err);
      }
      _configApiUrl = result.configApiUrl;
      let configUrl = url.parse(result.configApiUrl);
      let hostConfig = {
        ntlmHost: 'http://some.other.host.com:4567',
        username: 'nisse',
        password: 'manpower',
        domain: 'mnpwr'
      };
      let hostConfigJson = JSON.stringify(hostConfig)
      let configReq = http.request({
        method: 'POST',
        path:  '/ntlm-config',
        host: configUrl.hostname,
        port: configUrl.port,
        timeout: 15000,
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'content-length': Buffer.byteLength(hostConfigJson)
        } 
      }, (res) => {
        assert.equal(res.statusCode, 200);

        let proxyUrl = url.parse(result.ntlmProxyUrl);

        let proxyReq = http.request({
          method: 'GET',
          path:  '/test',
          host: proxyUrl.hostname,
          port: proxyUrl.port,
          timeout: 15000,
          headers: {
            'Host': remoteHostWithPort
          } 
        }, (res) => {
          assert.equal(res.statusCode, 401);
          assert.equal('authorization' in remoteHostRequestHeaders, false);
          done();
        });
        proxyReq.on('error', (err) => {
          return done(err);
        });
        proxyReq.end();  
      });
      configReq.on('error', (err) => {
        return done(err);
      });
      configReq.write(hostConfigJson);
      configReq.end();
    });
  });

  it('configured proxy shall not add authentication header after reset', function(done) {
    // Arrange
    portsFileExistsStub.returns(false);
    savePortsFileStub.callsFake(function(ports, callback) { return callback(); });
    deletePortsFileStub.callsFake(function(callback) { return callback(); });

    // Act
    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      if (err) {
        return done(err);
      }
      _configApiUrl = result.configApiUrl;
      let configUrl = url.parse(result.configApiUrl);
      let hostConfig = {
        ntlmHost: 'http://' + remoteHostWithPort,
        username: 'nisse',
        password: 'manpower',
        domain: 'mnpwr'
      };
      let hostConfigJson = JSON.stringify(hostConfig)
      let configReq = http.request({
        method: 'POST',
        path:  '/ntlm-config',
        host: configUrl.hostname,
        port: configUrl.port,
        timeout: 15000,
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'content-length': Buffer.byteLength(hostConfigJson)
        } 
      }, (res) => {
        assert.equal(res.statusCode, 200);

        let configResetReq = http.request({
          method: 'POST',
          path:  '/reset',
          host: configUrl.hostname,
          port: configUrl.port,
          timeout: 15000
        }, (res) => {
          assert.equal(res.statusCode, 200);
          
          let proxyUrl = url.parse(result.ntlmProxyUrl);

          let proxyReq = http.request({
            method: 'GET',
            path:  '/test',
            host: proxyUrl.hostname,
            port: proxyUrl.port,
            timeout: 15000,
            headers: {
              'Host': remoteHostWithPort
            } 
          }, (res) => {
            assert.equal(res.statusCode, 401);
            assert.equal('authorization' in remoteHostRequestHeaders, false);
            done();
          });
          proxyReq.on('error', (err) => {
            return done(err);
          });
          proxyReq.end();  
        });
        configResetReq.on('error', (err) => {
          return done(err);
        });
        configResetReq.end();
      });  
      configReq.on('error', (err) => {
        return done(err);
      });
      configReq.write(hostConfigJson);
      configReq.end();
    });

  });
});
