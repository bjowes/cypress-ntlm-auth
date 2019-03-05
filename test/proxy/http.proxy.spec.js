// cSpell:ignore nisse, mptst

const expressServer = require('./expressServer');
const proxyFacade = require('./proxyFacade');
const sinon = require('sinon');
const assert = require('assert');
const portsFile = require('../../src/util/portsFile');
const proxy = require('../../src/proxy/server');

let configApiUrl;
let ntlmProxyUrl;
let httpUrl;
let savePortsFileStub;
let portsFileExistsStub;

describe('Proxy for HTTP host with NTLM', function() {
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
      expressServer.startHttpServer(true, null, (url) => {
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
  });

  it('should handle authentication for GET requests', function(done) {
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

  it('should return 401 for unconfigured host on GET requests', function(done) {
    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null, (res, err) => {
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
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'POST', '/post', body, (res, err) => {
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

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'POST', '/post', body, (res, err) => {
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
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'PUT', '/put', body, (res, err) => {
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

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'PUT', '/put', body, (res, err) => {
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
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'DELETE', '/delete', body, (res, err) => {
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

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'DELETE', '/delete', body, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 401);
      return done();
    });
  });
});

describe('Proxy for HTTP host without NTLM', function() {

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
      expressServer.startHttpServer(false, null, (url) => {
        httpUrl = url;
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

  it('should pass through GET requests for non NTLM host', function(done) {
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

  it('should pass through POST requests for non NTLM host', function(done) {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'POST', '/post', body, (res, err) => {
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

  it('should pass through PUT requests for non NTLM host', function(done) {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'PUT', '/put', body, (res, err) => {
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

  it('should pass through DELETE requests for non NTLM host', function(done) {
    let body = {
      ntlmHost: 'https://my.test.host/'
    };

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'DELETE', '/delete', body, (res, err) => {
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
