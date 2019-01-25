// cSpell:ignore nisse, mptst

const expressServer = require('./expressServer');
const proxyFacade = require('./proxyFacade');
const sinon = require('sinon');
const assert = require('assert');
const portsFile = require('../../src/util/portsFile');
const proxy = require('../../src/proxy/server');

let configApiUrl;
let ntlmProxyUrl;
let upstreamProxy;
let upstreamProxyUrl;
let upstreamProxyReqCount;

let httpUrl;
let savePortsFileStub;
let portsFileExistsStub;

describe('Proxy for HTTP host with NTLM and upstream proxy', function() {
  let ntlmHostConfig;

  before('Start HTTP server and proxy', function (done) {
    portsFileExistsStub = sinon.stub(portsFile, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub = sinon.stub(portsFile, 'save');
    savePortsFileStub.callsFake(function (ports, callback) {
      return callback();
    });

    this.timeout(15000);
    proxyFacade.startMitmProxy(false, (mitmProxy, mitmProxyUrl, err) => {
      if (err) {
        return done(err);
      }
      upstreamProxy = mitmProxy;
      upstreamProxyUrl = mitmProxyUrl;
      upstreamProxy.onRequest(function (ctx, callback) {
        upstreamProxyReqCount++;
        return callback();
      });
      upstreamProxy.onError(function (ctx, err /*, errorKind */ ) {
        return done(err);
      });
      expressServer.startHttpServer(true, (url) => {
        httpUrl = url;
        ntlmHostConfig = {
          ntlmHost: httpUrl,
          username: 'nisse',
          password: 'manpower',
          domain: 'mptst'
        };
        proxy.startProxy(upstreamProxyUrl, null, null, false, false,
          (result, err) => {
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
    proxyFacade.stopMitmProxy(upstreamProxy, () => {
      expressServer.stopHttpServer((err) => {
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
    upstreamProxyReqCount = 0;
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
        assert.strictEqual(upstreamProxyReqCount, 2); // Two requests due to handshake
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
      assert.strictEqual(upstreamProxyReqCount, 1);
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
        assert.strictEqual(upstreamProxyReqCount, 2); // Two requests due to handshake
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
      assert.strictEqual(upstreamProxyReqCount, 1);
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
        assert.strictEqual(upstreamProxyReqCount, 2); // Two requests due to handshake
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
      assert.strictEqual(upstreamProxyReqCount, 1);
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
        assert.strictEqual(upstreamProxyReqCount, 2); // Two requests due to handshake
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
      assert.strictEqual(upstreamProxyReqCount, 1);
      assert.strictEqual(res.statusCode, 401);
      return done();
    });
  });
});

describe('Proxy for HTTP host without NTLM and upstream proxy', function() {

  before('Start HTTP server and proxy', function (done) {
    portsFileExistsStub = sinon.stub(portsFile, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub = sinon.stub(portsFile, 'save');
    savePortsFileStub.callsFake(function (ports, callback) {
      return callback();
    });

    this.timeout(15000);
    proxyFacade.startMitmProxy(false, (mitmProxy, mitmProxyUrl, err) => {
      if (err) {
        return done(err);
      }
      upstreamProxy = mitmProxy;
      upstreamProxyUrl = mitmProxyUrl;
      upstreamProxy.onRequest(function (ctx, callback) {
        upstreamProxyReqCount++;
        return callback();
      });
      upstreamProxy.onError(function (ctx, err /*, errorKind */) {
        return done(err);
      });
      expressServer.startHttpServer(false, (url) => {
        httpUrl = url;
        proxy.startProxy(upstreamProxyUrl, null, null, false, false,
          (result, err) => {
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
    proxyFacade.stopMitmProxy(upstreamProxy, () => {
      expressServer.stopHttpServer((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
    });
  });

  beforeEach('Reset upstream req count', function() {
    upstreamProxyReqCount = 0;
  });

  it('should pass through GET requests for non NTLM host', function(done) {
    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(upstreamProxyReqCount, 1);
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
      assert.strictEqual(upstreamProxyReqCount, 1);
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
      assert.strictEqual(upstreamProxyReqCount, 1);
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
      assert.strictEqual(upstreamProxyReqCount, 1);
      assert.strictEqual(res.statusCode, 200);
      assert(res.body.length > 20);
      let body = JSON.parse(res.body);
      assert.strictEqual(body.ntlmHost, 'https://my.test.host/');
      assert.strictEqual(body.reply, 'OK ÅÄÖéß');
      return done();
    });
  });
});

describe('Proxy for HTTP host without NTLM, upstream proxy + NO_PROXY', function() {

  before('Start HTTP server', function (done) {
    portsFileExistsStub = sinon.stub(portsFile, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub = sinon.stub(portsFile, 'save');
    savePortsFileStub.callsFake(function (ports, callback) {
      return callback();
    });

    this.timeout(15000);
    proxyFacade.startMitmProxy(false, (mitmProxy, mitmProxyUrl, err) => {
      if (err) {
        return done(err);
      }
      upstreamProxy = mitmProxy;
      upstreamProxyUrl = mitmProxyUrl;
      upstreamProxy.onRequest(function (ctx, callback) {
        upstreamProxyReqCount++;
        return callback();
      });
      upstreamProxy.onError(function (ctx, err /*, errorKind */) {
        return done(err);
      });
      expressServer.startHttpServer(false, (url) => {
        httpUrl = url;
        return done();
      });
    });
  });

  afterEach('Stop proxy', function() {
    proxy.shutDown(true);
  });

  after('Stop HTTP server', function(done) {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }

    httpUrl = null;
    proxyFacade.stopMitmProxy(upstreamProxy, () => {
      expressServer.stopHttpServer((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
    });
  });

  beforeEach('Reset upstream req count', function() {
    upstreamProxyReqCount = 0;
  });

  it('should not use upstream proxy for http host when only https upstream proxy is defined', function(done) {
    proxy.startProxy(null, upstreamProxyUrl, null, false, false,
      (result, err) => {
      if (err) {
        return done(err);
      }
      configApiUrl = result.configApiUrl;
      ntlmProxyUrl = result.ntlmProxyUrl;
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null, (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(upstreamProxyReqCount, 0);
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.length > 20);
        let body = JSON.parse(res.body);
        assert.strictEqual(body.reply, 'OK ÅÄÖéß');
        return done();
      });
    });
  });

  it('should not use upstream proxy with NO_PROXY localhost', function(done) {
    proxy.startProxy(upstreamProxyUrl, null, 'localhost', false, false, (result, err) => {
      if (err) {
        return done(err);
      }
      configApiUrl = result.configApiUrl;
      ntlmProxyUrl = result.ntlmProxyUrl;
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null, (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(upstreamProxyReqCount, 0);
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.length > 20);
        let body = JSON.parse(res.body);
        assert.strictEqual(body.reply, 'OK ÅÄÖéß');
        return done();
      });
    });
  });

  it('should not use upstream proxy with NO_PROXY *host', function(done) {
    proxy.startProxy(upstreamProxyUrl, null, '*host', false, false, (result, err) => {
      if (err) {
        return done(err);
      }
      configApiUrl = result.configApiUrl;
      ntlmProxyUrl = result.ntlmProxyUrl;
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null, (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(upstreamProxyReqCount, 0);
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.length > 20);
        let body = JSON.parse(res.body);
        assert.strictEqual(body.reply, 'OK ÅÄÖéß');
        return done();
      });
    });
  });

  it('should not use upstream proxy with NO_PROXY local*', function(done) {
    proxy.startProxy(upstreamProxyUrl, null, 'local*', false, false, (result, err) => {
      if (err) {
        return done(err);
      }
      configApiUrl = result.configApiUrl;
      ntlmProxyUrl = result.ntlmProxyUrl;
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null, (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(upstreamProxyReqCount, 0);
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.length > 20);
        let body = JSON.parse(res.body);
        assert.strictEqual(body.reply, 'OK ÅÄÖéß');
        return done();
      });
    });
  });

  it('should not use upstream proxy with NO_PROXY *', function(done) {
    proxy.startProxy(upstreamProxyUrl, null, '*', false, false, (result, err) => {
      if (err) {
        return done(err);
      }
      configApiUrl = result.configApiUrl;
      ntlmProxyUrl = result.ntlmProxyUrl;
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null, (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(upstreamProxyReqCount, 0);
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.length > 20);
        let body = JSON.parse(res.body);
        assert.strictEqual(body.reply, 'OK ÅÄÖéß');
        return done();
      });
    });
  });

  it('should use upstream proxy with NO_PROXY google.com', function(done) {
    proxy.startProxy(upstreamProxyUrl, null, 'google.com', false, false, (result, err) => {
      if (err) {
        return done(err);
      }
      configApiUrl = result.configApiUrl;
      ntlmProxyUrl = result.ntlmProxyUrl;
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null, (res, err) => {
        if (err) {
          return done(err);
        }
        assert.strictEqual(upstreamProxyReqCount, 1);
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.length > 20);
        let body = JSON.parse(res.body);
        assert.strictEqual(body.reply, 'OK ÅÄÖéß');
        return done();
      });
    });
  });
});
