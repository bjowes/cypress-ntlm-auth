// cSpell:ignore nisse, mptst

// This test runs for a long time and is not suitable for test automation.
// Run test like this:
// node_modules/.bin/mocha test/manual/http.proxy.duration.manualTest.js --expose-gc

const expressServer = require('../proxy/expressServer');
const proxyFacade = require('../proxy/proxyFacade');
const sinon = require('sinon');
const assert = require('assert');
const portsFile = require('../../src/util/portsFile');
const proxy = require('../../src/proxy/server');

let configApiUrl;
let ntlmProxyUrl;
let httpUrl;
let savePortsFileStub;
let portsFileExistsStub;

const phaseDuration = 150000;
const phaseFinalizeDuration = 2000;
const testTimeout = (phaseDuration + phaseFinalizeDuration) * 2 + 5000;


describe('Duration test: Proxy for HTTP host with NTLM', function() {
  let ntlmHostConfig;

  before('Start HTTP server and proxy', function (done) {
    if (!global || !global.gc) {
      return done(new Error('Test must be executed with --expose-gc option'));
    }

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

  it('should not leak memory handling multiple GET requests for the same NTLM host', function(done) {
    this.timeout(testTimeout);
    proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 200);

      let runDuration = true;
      let burstCount = 5;
      sendBurst(burstCount);

      setTimeout(() => {
        runDuration = false;
        setTimeout(() => {
          // Await result
          const preGcUsed1 = process.memoryUsage().heapUsed / 1024 / 1024;
          global.gc();
          const used1 = process.memoryUsage().heapUsed / 1024 / 1024;
          console.log(`Phase 1: The script uses approximately ${used1.toFixed(3)} MB (${preGcUsed1.toFixed(3)} MB before GC)`);

          runDuration = true;
          sendBurst(burstCount);

          setTimeout(() => {
            runDuration = false;
            setTimeout(() => {
              // Await result
              const preGcUsed2 = process.memoryUsage().heapUsed / 1024 / 1024;
              global.gc();
              const used2 = process.memoryUsage().heapUsed / 1024 / 1024;
              console.log(`Phase 2: The script uses approximately ${used2.toFixed(3)} MB (${preGcUsed2.toFixed(3)} before GC)`);

              assert(used2 - used1 < 1.0, 'Unexpected memory usage diff, possible memory leak');
              return done();
            }, phaseFinalizeDuration);
          }, phaseDuration);
        }, phaseFinalizeDuration);
      }, phaseDuration);

      function sendBurst(burstCount) {
        let responseCount = 0;
        //console.log("Send burst");
        for (let j = 0; j < burstCount; j++) {
          proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null, (res, err) => {
            if (err) {
              return done(err);
            }
            assert.strictEqual(res.statusCode, 200);
            assert(res.body.length > 20);
            let body = JSON.parse(res.body);
            assert.strictEqual(body.reply, 'OK ÅÄÖéß');
            responseCount++;
            if (responseCount === burstCount && runDuration) {
              setTimeout(() => sendBurst(burstCount), 25);
            }
          });
        }
      }

    });
  });

  it('should not leak memory handling multiple GET requests for the same NTLM host with reconfiguration', function(done) {
    this.timeout(testTimeout);
    proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig, (res, err) => {
      if (err) {
        return done(err);
      }
      assert.strictEqual(res.statusCode, 200);

      let runDuration = true;
      let burstCount = 5;
      sendBurst(burstCount);

      setTimeout(() => {
        runDuration = false;
        setTimeout(() => {
          // Await result
          const preGcUsed1 = process.memoryUsage().heapUsed / 1024 / 1024;
          global.gc();
          const used1 = process.memoryUsage().heapUsed / 1024 / 1024;
          console.log(`Phase 1: The script uses approximately ${used1.toFixed(3)} MB (${preGcUsed1.toFixed(3)} MB before GC)`);

          runDuration = true;
          sendBurst(burstCount);

          setTimeout(() => {
            runDuration = false;
            setTimeout(() => {
              // Await result
              const preGcUsed2 = process.memoryUsage().heapUsed / 1024 / 1024;
              global.gc();
              const used2 = process.memoryUsage().heapUsed / 1024 / 1024;
              console.log(`Phase 2: The script uses approximately ${used2.toFixed(3)} MB (${preGcUsed2.toFixed(3)} before GC)`);

              assert(used2 - used1 < 1.0, 'Unexpected memory usage diff, possible memory leak');
              return done();
            }, phaseFinalizeDuration);
          }, phaseDuration);
        }, phaseFinalizeDuration);
      }, phaseDuration);

      function sendBurst(burstCount) {
        let responseCount = 0;
        //console.log("Send burst");
        proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig, (res, err) => {
          if (err) {
            return done(err);
          }
          assert.strictEqual(res.statusCode, 200);

          for (let j = 0; j < burstCount; j++) {
            proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null, (res, err) => {
              if (err) {
                return done(err);
              }
              assert.strictEqual(res.statusCode, 200);
              assert(res.body.length > 20);
              let body = JSON.parse(res.body);
              assert.strictEqual(body.reply, 'OK ÅÄÖéß');
              responseCount++;
              if (responseCount === burstCount && runDuration) {
                setTimeout(() => sendBurst(burstCount), 25);
              }
            });
          }
        });
      }

    });
  });

  it('should not leak memory handling multiple GET requests for a NTLM host without config', function(done) {
    this.timeout(testTimeout);
    let runDuration = true;
    let burstCount = 5;
    sendBurst(burstCount);

    setTimeout(() => {
      runDuration = false;
      setTimeout(() => {
        // Await result
        const preGcUsed1 = process.memoryUsage().heapUsed / 1024 / 1024;
        global.gc();
        const used1 = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`Phase 1: The script uses approximately ${used1.toFixed(3)} MB (${preGcUsed1.toFixed(3)} MB before GC)`);

        runDuration = true;
        sendBurst(burstCount);

        setTimeout(() => {
          runDuration = false;
          setTimeout(() => {
            // Await result
            const preGcUsed2 = process.memoryUsage().heapUsed / 1024 / 1024;
            global.gc();
            const used2 = process.memoryUsage().heapUsed / 1024 / 1024;
            console.log(`Phase 2: The script uses approximately ${used2.toFixed(3)} MB (${preGcUsed2.toFixed(3)} before GC)`);

            assert(used2 - used1 < 1.0, 'Unexpected memory usage diff, possible memory leak');
            return done();
          }, phaseFinalizeDuration);
        }, phaseDuration);
      }, phaseFinalizeDuration);
    }, phaseDuration);

    function sendBurst(burstCount) {
      let responseCount = 0;
      //console.log("Send burst");
      for (let j = 0; j < burstCount; j++) {
        proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null, (res, err) => {
          if (err) {
            return done(err);
          }
          assert.strictEqual(res.statusCode, 401);
          responseCount++;
          if (responseCount === burstCount && runDuration) {
            setTimeout(() => sendBurst(burstCount), 25);
          }
        });
      }
    }
  });
});

describe('Duration test: Proxy for HTTP host without NTLM', function() {

  before('Start HTTP server and proxy', function (done) {
    if (!global || !global.gc) {
      return done(new Error('Test must be executed with --expose-gc option'));
    }
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

  it('should not leak memory handling multiple GET requests for non NTLM host', function(done) {
    this.timeout(testTimeout);
    let runDuration = true;
    let burstCount = 5;
    sendBurst(burstCount);

    setTimeout(() => {
      runDuration = false;
      setTimeout(() => {
        // Await result
        const preGcUsed1 = process.memoryUsage().heapUsed / 1024 / 1024;
        global.gc();
        const used1 = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`Phase 1: The script uses approximately ${used1.toFixed(3)} MB (${preGcUsed1.toFixed(3)} MB before GC)`);

        runDuration = true;
        sendBurst(burstCount);

        setTimeout(() => {
          runDuration = false;
          setTimeout(() => {
            // Await result
            const preGcUsed2 = process.memoryUsage().heapUsed / 1024 / 1024;
            global.gc();
            const used2 = process.memoryUsage().heapUsed / 1024 / 1024;
            console.log(`Phase 2: The script uses approximately ${used2.toFixed(3)} MB (${preGcUsed2.toFixed(3)} before GC)`);

            assert(used2 - used1 < 1.0, 'Unexpected memory usage diff, possible memory leak');
            return done();
          }, phaseFinalizeDuration);
        }, phaseDuration);
      }, phaseFinalizeDuration);
    }, phaseDuration);


    function sendBurst(burstCount) {
      const body = {
        ntlmHost: 'https://my.test.host/'
      };
      let responseCount = 0;
      //console.log("Send burst");
      for (let j = 0; j < burstCount; j++) {
        proxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'POST', '/post', body, (res, err) => {
          if (err) {
            return done(err);
          }
          assert.strictEqual(res.statusCode, 200);
          assert(res.body.length > 20);
          let body = JSON.parse(res.body);
          assert.strictEqual(body.ntlmHost, 'https://my.test.host/');
          assert.strictEqual(body.reply, 'OK ÅÄÖéß');
          responseCount++;
          if (responseCount === burstCount && runDuration) {
            setTimeout(() => sendBurst(burstCount), 25);
          }
        });
      }
    }
  });
});
