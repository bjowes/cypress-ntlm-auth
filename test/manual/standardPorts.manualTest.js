// cSpell:ignore nisse, mptst

// This test binds to the default HTTP and HTTPS ports (80 and 443),
// which requires admin priveliges on many platforms. Hence it must
// be run manually. On OS X, you can use (from the project root)
// sudo node_modules/.bin/mocha test/manual/standardPorts.manualtest.js

const expressServer = require('../proxy/expressServer');
const proxyFacade = require('../proxy/proxyFacade');
const sinon = require('sinon');
const assert = require('assert');
const portsFile = require('../../src/util/portsFile');
const proxy = require('../../src/proxy/server');

let configApiUrl;
let ntlmProxyUrl;
let httpUrl;
let httpsUrl;
let savePortsFileStub;
let portsFileExistsStub;

describe('Proxy for HTTP host on port 80 with NTLM', function() {
  let ntlmHostConfig;

  before('Start HTTP server and proxy', function (done) {
    portsFileExistsStub = sinon.stub(portsFile, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub = sinon.stub(portsFile, 'save');
    savePortsFileStub.callsFake(function (ports, callback) {
      return callback();
    });

    this.timeout(15000);
    proxyFacade.initMitmProxy((err) => {
      if (err) {
        return done(err);
      }
      expressServer.startHttpServer(true, 80, (url) => {
        httpUrl = url;
        ntlmHostConfig = {
          ntlmHost: httpUrl,
          username: 'nisse',
          password: 'manpower',
          domain: 'mptst'
        };
        proxy.startProxy(null, null, null, false, false, (result, err) => {
          if (err) {
            return done(err);
          }
          configApiUrl = result.configApiUrl;
          ntlmProxyUrl = result.ntlmProxyUrl;
          return done();
        });
      });
    });
  });

  after('Stop HTTP server and proxy', function(done) {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }

    proxy.shutDown(true);
    expressServer.stopHttpServer((err) => {
      if (err) {
        return done(err);
      }
      return done();
    });
  });

  beforeEach('Reset NTLM config', function(done) {
    proxyFacade.sendNtlmReset(configApiUrl, (err) => {
      if (err) {
        return done(err);
      }
      return done();
    });
    ntlmHostConfig.ntlmHost = httpUrl;
  });

  it('should handle authentication for GET requests when config includes port', function(done) {
    ntlmHostConfig.ntlmHost = 'http://localhost:80';
    proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 200);
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null, (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.length > 20);
        let body = JSON.parse(res.body);
        assert.strictEqual(body.reply, 'OK ÅÄÖéß');
        return done();
      });
    });
  });

  it('should handle authentication for GET requests when config excludes port', function(done) {
    ntlmHostConfig.ntlmHost = 'http://localhost';
    proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 200);
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null, (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.length > 20);
        let body = JSON.parse(res.body);
        assert.strictEqual(body.reply, 'OK ÅÄÖéß');
        return done();
      });
    });
  });
});

describe('Proxy for HTTPS host on port 443 with NTLM', function() {
  let ntlmHostConfig;

  before('Start HTTPS server and proxy', function (done) {
    portsFileExistsStub = sinon.stub(portsFile, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub = sinon.stub(portsFile, 'save');
    savePortsFileStub.callsFake(function (ports, callback) {
      return callback();
    });

    this.timeout(15000);
    proxyFacade.initMitmProxy((err) => {
      if (err) {
        return done(err);
      }
      expressServer.startHttpsServer(true, 443, (url) => {
        httpsUrl = url;
        ntlmHostConfig = {
          ntlmHost: httpsUrl,
          username: 'nisse',
          password: 'manpower',
          domain: 'mptst'
        };
        proxy.startProxy(null, null, null, false, false, (result, err) => {
          if (err) {
            return done(err);
          }
          configApiUrl = result.configApiUrl;
          ntlmProxyUrl = result.ntlmProxyUrl;
          return done();
        });
      });
    });
  });

  after('Stop HTTPS server and proxy', function(done) {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }

    proxy.shutDown(true);
    expressServer.stopHttpsServer((err) => {
      if (err) {
        return done(err);
      }
      return done();
    });
  });

  beforeEach('Reset NTLM config', function(done) {
    proxyFacade.sendNtlmReset(configApiUrl, (err) => {
      if (err) {
        return done(err);
      }
      return done();
    });
    ntlmHostConfig.ntlmHost = httpsUrl;
  });

  it('should handle authentication for GET requests when config includes port', function(done) {
    ntlmHostConfig.ntlmHost = 'https://localhost:443';
    proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 200);
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.length > 20);
        let body = JSON.parse(res.body);
        assert.strictEqual(body.reply, 'OK ÅÄÖéß');
        return done();
      });
    });
  });

  it('should handle authentication for GET requests when config excludes port', function(done) {
    ntlmHostConfig.ntlmHost = 'https://localhost';
    proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 200);
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.length > 20);
        let body = JSON.parse(res.body);
        assert.strictEqual(body.reply, 'OK ÅÄÖéß');
        return done();
      });
    });
  });
});

