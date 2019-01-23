const proxyFacade = require('./proxyFacade');
const sinon = require('sinon');
const assert = require('assert');

const portsFile = require('../../src/util/portsFile');

const proxy = require('../../src/proxy/server');

describe('Configuration API', () => {
  let configApiUrl;
  let savePortsFileStub;
  let portsFileExistsStub;

  before(function (done) {
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
      proxy.startProxy(null, null, null, false, false, (result, err) => {
        if (err) {
          return done(err);
        }
        configApiUrl = result.configApiUrl;
        return done();
      });
    });
  });

  after(function (done) {
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
      return done();
    });
  });

  it('ntlm-config should return bad request if the username contains backslash', function (done) {
    // Arrange
    let hostConfig = {
      ntlmHost: 'http://localhost:5000',
      username: 'nisse\\nisse',
      password: 'dummy',
      domain: 'mptest'
    };

    // Act
    proxyFacade.sendNtlmConfig(configApiUrl, hostConfig, (res, err) => {
      assert.equal(res.statusCode, 400);
      assert.equal(res.body, 'Config parse error. Username contains invalid characters or is too long.');
      return done();
    });
  });

  it('ntlm-config should return bad request if the domain contains backslash', function (done) {
    // Arrange
    let hostConfig = {
      ntlmHost: 'http://localhost:5000',
      username: 'nisse',
      password: 'dummy',
      domain: 'mptest\\mptest'
    };

    // Act
    proxyFacade.sendNtlmConfig(configApiUrl, hostConfig, (res, err) => {
      assert.equal(res.statusCode, 400);
      assert.equal(res.body, 'Config parse error. Domain contains invalid characters or is too long.');
      return done();
    });
  });

  it('ntlm-config should return bad request if the ntlmHost includes a path', function (done) {
    // Arrange
    let hostConfig = {
      ntlmHost: 'http://localhost:5000/search',
      username: 'nisse',
      password: 'dummy',
      domain: 'mptest'
    };

    // Act
    proxyFacade.sendNtlmConfig(configApiUrl, hostConfig, (res, err) => {
      assert.equal(res.statusCode, 400);
      assert.equal(res.body, 'Config parse error. Invalid ntlmHost, must not contain any path or query (https://www.google.com is ok, https://www.google.com/search is not ok)');
      return done();
    });
  });
});
