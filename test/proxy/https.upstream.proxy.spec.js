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

let httpsUrl;
let savePortsFileStub;
let portsFileExistsStub;

describe('Proxy for HTTPS host with NTLM and upstream proxy', function() {
  let ntlmHostConfig;

  before('Start HTTPS server and proxy', function (done) {
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
      upstreamProxy.onError(function (ctx, err, errorKind) {
        var url = (ctx && ctx.clientToProxyRequest) ? ctx.clientToProxyRequest.url : '';
        console.log('upstreamProxy: ' + errorKind + ' on ' + url + ':', err);
      });
      expressServer.startHttpsServer(true, (url) => {
        httpsUrl = url;
        ntlmHostConfig = {
          ntlmHost: httpsUrl,
          username: 'nisse',
          password: 'manpower',
          domain: 'mptst'
        };
        proxy.startProxy(null, upstreamProxyUrl, null, false, false,
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
    upstreamProxyReqCount = 0;
  });

  it('should handle authentication for GET requests', function(done) {
    proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 200);
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null,
      (res, err) => {
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
    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null,
    (res, err) => {
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
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'POST', '/post', body,
      (res, err) => {
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

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'POST', '/post', body,
    (res, err) => {
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
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'PUT', '/put', body,
      (res, err) => {
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

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'PUT', '/put', body,
    (res, err) => {
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
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'DELETE', '/delete', body,
      (res, err) => {
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

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'DELETE', '/delete', body,
    (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(upstreamProxyReqCount, 1);
      assert.strictEqual(res.statusCode, 401);
      return done();
    });
  });
});

describe('Proxy for HTTPS host without NTLM and upstream proxy', function() {

  before('Start HTTPS server and proxy', function (done) {
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
      upstreamProxy.onError(function (ctx, err, errorKind) {
        var url = (ctx && ctx.clientToProxyRequest) ? ctx.clientToProxyRequest.url : '';
        console.log('upstreamProxy: ' + errorKind + ' on ' + url + ':', err);
      });
      expressServer.startHttpsServer(false, (url) => {
        httpsUrl = url;
        proxy.startProxy(null, upstreamProxyUrl, null, false, false,
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
      expressServer.stopHttpsServer((err) => {
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
    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, (res, err) => {
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

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'POST', '/post', body, (res, err) => {
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

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'PUT', '/put', body, (res, err) => {
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

    proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'DELETE', '/delete', body, (res, err) => {
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

describe('Proxy for HTTPS host without NTLM, upstream proxy + NO_PROXY', function() {

  before('Start HTTPS server', function (done) {
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
      upstreamProxy.onError(function (ctx, err, errorKind) {
        var url = (ctx && ctx.clientToProxyRequest) ? ctx.clientToProxyRequest.url : '';
        console.log('upstreamProxy: ' + errorKind + ' on ' + url + ':', err);
      });
      expressServer.startHttpsServer(false, (url) => {
        httpsUrl = url;
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

    httpsUrl = null;
    proxyFacade.stopMitmProxy(upstreamProxy, () => {
      expressServer.stopHttpsServer((err) => {
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

  it('should not use upstream proxy for https host when only http upstream proxy is defined', function(done) {
    proxy.startProxy(upstreamProxyUrl, null, null, false, false,
      (result, err) => {
      if (err) {
        return done(err);
      }
      configApiUrl = result.configApiUrl;
      ntlmProxyUrl = result.ntlmProxyUrl;
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, (res, err) => {
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
    proxy.startProxy(null, upstreamProxyUrl, 'localhost', false, false, (result, err) => {
      if (err) {
        return done(err);
      }
      configApiUrl = result.configApiUrl;
      ntlmProxyUrl = result.ntlmProxyUrl;
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, (res, err) => {
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
    proxy.startProxy(null, upstreamProxyUrl, '*host', false, false, (result, err) => {
      if (err) {
        return done(err);
      }
      configApiUrl = result.configApiUrl;
      ntlmProxyUrl = result.ntlmProxyUrl;
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, (res, err) => {
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
    proxy.startProxy(null, upstreamProxyUrl, 'local*', false, false, (result, err) => {
      if (err) {
        return done(err);
      }
      configApiUrl = result.configApiUrl;
      ntlmProxyUrl = result.ntlmProxyUrl;
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, (res, err) => {
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
    proxy.startProxy(null, upstreamProxyUrl, '*', false, false, (result, err) => {
      if (err) {
        return done(err);
      }
      configApiUrl = result.configApiUrl;
      ntlmProxyUrl = result.ntlmProxyUrl;
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, (res, err) => {
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
    proxy.startProxy(null, upstreamProxyUrl, 'google.com', false, false, (result, err) => {
      if (err) {
        return done(err);
      }
      configApiUrl = result.configApiUrl;
      ntlmProxyUrl = result.ntlmProxyUrl;
      proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, 'GET', '/get', null, (res, err) => {
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
