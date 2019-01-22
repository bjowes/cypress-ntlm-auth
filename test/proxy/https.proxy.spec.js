const expressServer = require('./expressServer');
const proxyFacade = require('./proxyFacade');
const sinon = require('sinon');
const assert = require('assert');
const portsFile = require('../../src/util/portsFile');
const proxy = require('../../src/proxy/server');

let configApiUrl;
let ntlmProxyUrl;
let httpsUrl;
let savePortsFileStub;
let portsFileExistsStub;

describe('Proxy for HTTPS host with NTLM', function() {
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
      expressServer.startHttpsServer(true, (url) => {
        httpsUrl = url;
        ntlmHostConfig = {
          ntlmHost: httpsUrl,
          username: 'nisse',
          password: 'manpower',
          domain: 'mptst'
        };
        proxy.startProxy(null, null, false, (result, err) => {
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

    proxyFacade.sendQuitCommand(configApiUrl, true, (err) => {
      if (err) {
        return done(err);
      }
      configApiUrl = null;
      ntlmProxyUrl = null;
      httpsUrl = null;
      expressServer.stopHttpsServer((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
    });
  });

  beforeEach('Reset NTLM config', function(done) {
    proxyFacade.sendNtlmReset(configApiUrl, (err) => {
      if (err) {
        return done(err);
      }
      return done();
    });
  });

  it('should handle authentication for GET requests', function(done) {
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

  it('should return 401 for unconfigured host on GET requests', function(done) {
    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 401);
      return done();
    });
  });

  it('should handle authentication for POST requests', function(done) {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };

    proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 200);
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'POST', '/post', body, (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.length > 20);
        let body = JSON.parse(res.body);
        assert.strictEqual(body.ntlmHost, 'https://my.test.host/');
        assert.strictEqual(body.reply, 'OK ÅÄÖéß');
        return done();
      });
    });
  });

  it('should return 401 for unconfigured host on POST requests', function(done) {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'POST', '/post', body, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 401);
      return done();
    });
  });

  it('should handle authentication for PUT requests', function(done) {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };

    proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 200);
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'PUT', '/put', body, (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.length > 20);
        let body = JSON.parse(res.body);
        assert.strictEqual(body.ntlmHost, 'https://my.test.host/');
        assert.strictEqual(body.reply, 'OK ÅÄÖéß');
        return done();
      });
    });
  });

  it('should return 401 for unconfigured host on PUT requests', function(done) {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'PUT', '/put', body, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 401);
      return done();
    });
  });

  it('should handle authentication for DELETE requests', function(done) {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };

    proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 200);
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'DELETE', '/delete', body, (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.length > 20);
        let body = JSON.parse(res.body);
        assert.strictEqual(body.ntlmHost, 'https://my.test.host/');
        assert.strictEqual(body.reply, 'OK ÅÄÖéß');
        return done();
      });
    });
  });

  it('should return 401 for unconfigured host on DELETE requests', function(done) {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'DELETE', '/delete', body, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 401);
      return done();
    });
  });
});
