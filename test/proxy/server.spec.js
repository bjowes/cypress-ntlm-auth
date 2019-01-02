const assert = require('assert');
const getPath = require('platform-folders');
const path = require('path');
const mockFs = require('mock-fs');
const fs = require('fs');
const url = require('url');
const http = require('http');
const isPortReachable = require('is-port-reachable');

const portsFile = require('../../src/util/portsFile');
const portsFileName = 'cypress-ntlm-auth.port';
const portsFilePath = getPath.getDataHome();
const portsFileWithPath = path.join(getPath.getDataHome(), portsFileName);

const proxy = require('../../src/proxy/server');
let _configApiUrl;

function mockIconvLiteEncodings(mockOptions) {
  let encodingsFolderPath = path.join(__dirname, '../../node_modules/iconv-lite/encodings');
  let encodingsFolderContent = {};
  encodingsFolderContent['index.js'] = fs.readFileSync(path.join(encodingsFolderPath, 'index.js'));
  encodingsFolderContent['internal.js'] = fs.readFileSync(path.join(encodingsFolderPath, 'internal.js'));
  encodingsFolderContent['utf16.js'] = fs.readFileSync(path.join(encodingsFolderPath, 'utf16.js'));
  encodingsFolderContent['utf7.js'] = fs.readFileSync(path.join(encodingsFolderPath, 'utf7.js'));
  encodingsFolderContent['sbcs-codec.js'] = fs.readFileSync(path.join(encodingsFolderPath, 'sbcs-codec.js'));
  encodingsFolderContent['sbcs-data.js'] = fs.readFileSync(path.join(encodingsFolderPath, 'sbcs-data.js'));
  encodingsFolderContent['sbcs-data-generated.js'] = fs.readFileSync(path.join(encodingsFolderPath, 'sbcs-data-generated.js'));
  encodingsFolderContent['dbcs-codec.js'] = fs.readFileSync(path.join(encodingsFolderPath, 'dbcs-codec.js'));
  encodingsFolderContent['dbcs-data.js'] = fs.readFileSync(path.join(encodingsFolderPath, 'dbcs-data.js'));
  mockOptions[encodingsFolderPath] = encodingsFolderContent;
}

function mockPortsFilePath() {
  let mockOptions = {};
  mockOptions[portsFilePath] = {};
  mockIconvLiteEncodings(mockOptions); // required due to lazy loading of this node module
  mockFs(mockOptions);
}

function mockBadPath() {
  let mockOptions = {};
  mockOptions['anotherPath'] = {};
  mockFs(mockOptions);
}

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
  
  beforeEach(function() {
    mockFs.restore(); // Clear fs mock
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

  it('starting proxy should fail if portsFile path does not exist', function(done) {
    // Arrange
    mockBadPath();

    // Act
    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot create ' + portsFileWithPath);
      let exists = portsFile.portsFileExists();
      assert.equal(exists, false);
      return done();
    });
  }).timeout(5000);


  it('starting proxy should generate portsFile', function(done) {
    // Arrange
    mockPortsFilePath();

    // Act
    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      if (err) {
        return done(err);
      }
      
      let exists = portsFile.portsFileExists();
      assert.equal(exists, true);
      portsFile.parsePortsFile((ports, err) => {
        if (err) {
          return done(err);
        }
        assert.equal('ntlmProxyUrl' in ports, true);
        assert.equal('configApiUrl' in ports, true);
        assert.equal(ports.ntlmProxyUrl, result.ntlmProxyUrl);
        assert.equal(ports.configApiUrl, result.configApiUrl);
        isProxyReachable(ports, (reachable, err) => {
          if (err) {
            return done(err);
          }
          assert.equal(reachable, true, "Proxy should be reachable");
          _configApiUrl = ports.configApiUrl;
          return done();
        });
      });
    });
  }).timeout(5000);

  it('restarting proxy should terminate old proxy', function(done) {
    // Arrange
    mockPortsFilePath();
    let firstProxyPorts;
    let secondProxyPorts;

    // Act
    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      if (err) {
        return done(err);
      }
      
      portsFile.parsePortsFile((ports, err) => {
        if (err) {
          return done(err);
        }
        firstProxyPorts = ports;
        isProxyReachable(ports, (reachable, err) => {
          if (err) {
            return done(err);
          }
          assert.equal(reachable, true, "First proxy should be reachable");

          proxy.startProxy(null, null, false, (result, err) => {
            // Assert
            if (err) {
              return done(err);
            }
            
            portsFile.parsePortsFile((ports, err) => {
              if (err) {
                return done(err);
              }
      
              secondProxyPorts = ports;
              assert.notEqual(firstProxyPorts.ntlmProxyUrl, secondProxyPorts.ntlmProxyUrl);
              assert.notEqual(firstProxyPorts.configApiUrl, secondProxyPorts.configApiUrl);

              isProxyReachable(firstProxyPorts, (reachable, err) => {
                if (err) {
                  return done(err);
                }
                assert.equal(reachable, false, "First proxy should not be reachable");
                isProxyReachable(secondProxyPorts, (reachable, err) => {
                  if (err) {
                    return done(err);
                  }
                  assert.equal(reachable, true, "Second proxy should be reachable");
        
                  _configApiUrl = ports.configApiUrl;
                  return done();
                });
              });
            });
          });
        });

      });
    });
  }).timeout(10000);


  it('quit command shuts down the proxy, keep portsFile', function(done) {
    // Arrange
    mockPortsFilePath();

    // Act
    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      if (err) {
        return done(err);
      }
      
      portsFile.parsePortsFile((ports, err) => {
        if (err) {
          return done(err);
        }
        sendQuitCommand(ports.configApiUrl, true, (err) => {
          if (err) {
            return done(err);
          }

          let exists = portsFile.portsFileExists();
          assert.equal(exists, true);
          isProxyReachable(ports, (reachable, err) => {
            if (err) {
              return done(err);
            }
            assert.equal(reachable, false, "Proxy should not be reachable");
  
            portsFile.deletePortsFile((err) => {
              if (err) {
                return done(err);
              }
              return done();  
            });         
          });
        });
      });
    });
  }).timeout(5000);

  it('quit command shuts down the proxy, delete portsFile', function(done) {
    // Arrange
    mockPortsFilePath();

    // Act
    proxy.startProxy(null, null, false, (result, err) => {
      // Assert
      if (err) {
        return done(err);
      }
      
      portsFile.parsePortsFile((ports, err) => {
        if (err) {
          return done(err);
        }
        sendQuitCommand(ports.configApiUrl, false, (err) => {
          if (err) {
            return done(err);
          }

          let exists = portsFile.portsFileExists();
          assert.equal(exists, false);
          isProxyReachable(ports, (reachable, err) => {
            if (err) {
              return done(err);
            }
            assert.equal(reachable, false, "Proxy should not be reachable");  
            return done();  
          });
        });
      });
    });
  }).timeout(5000);
});
