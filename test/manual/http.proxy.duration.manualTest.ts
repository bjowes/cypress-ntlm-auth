// cSpell:ignore nisse, mptst

// This test runs for a long time and is not suitable for test automation.
// Run test like this:
// node_modules/.bin/mocha  --require ./test/ts.hooks.js --require source-map-support/register test/manual/http.proxy.duration.manualTest.ts --expose-gc

import 'mocha';

import { ProxyFacade } from '../proxy/proxy.facade';
import { expect } from 'chai';
import { DependencyInjection } from '../../src/proxy/dependency.injection';
import { TYPES } from '../../src/proxy/dependency.injection.types';
import { ExpressServer } from '../proxy/express.server';
import sinon from 'sinon';
import { PortsFileService } from '../../src/util/ports.file.service';
import { ICoreServer } from '../../src/proxy/interfaces/i.core.server';
import { PortsFile } from '../../src/models/ports.file.model';
import { NtlmConfig } from '../../src/models/ntlm.config.model';

let configApiUrl: string;
let ntlmProxyUrl: string;
let httpUrl: string;
let savePortsFileStub: sinon.SinonStub<[PortsFile], Promise<void>>;
let portsFileExistsStub: sinon.SinonStub<[], boolean>;

const phaseDuration = 1500;
const phaseFinalizeDuration = 2000;
const testTimeout = (phaseDuration + phaseFinalizeDuration) * 2 + 5000;


describe('Duration test: Proxy for HTTP host with NTLM', function() {
  let ntlmHostConfig: NtlmConfig;
  let dependencyInjection = new DependencyInjection();
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;

  before('Start HTTP server and proxy', async function () {
    if (!global || !global.gc) {
       throw (new Error('Test must be executed with --expose-gc option'));
    }

    savePortsFileStub = sinon.stub(PortsFileService.prototype, 'save');
    portsFileExistsStub = sinon.stub(PortsFileService.prototype, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub.returns(Promise.resolve());

    this.timeout(15000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(true, null);
    ntlmHostConfig = {
      ntlmHost: httpUrl,
      username: 'nisse',
      password: 'manpower',
      domain: 'mptst'
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(false, undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after('Stop HTTP server and proxy', async function() {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }

    await coreServer.stop(true);
    await expressServer.stopHttpServer();
  });

  beforeEach('Reset NTLM config', async function() {
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it('should not leak memory handling multiple GET requests for the same NTLM host', function(done) {
    this.timeout(testTimeout);
    let runDuration = true;
    let burstCount = 5;
    ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig).then((res) => {

      expect(res.status).to.be.equal(200);

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

              expect(used2 - used1, 'Unexpected memory usage diff, possible memory leak').to.be.lessThan(1.0);
              return done();
            }, phaseFinalizeDuration);
          }, phaseDuration);
        }, phaseFinalizeDuration);
      }, phaseDuration);
    });

    function sendBurst(burstCount: number) {
      let responseCount = 0;
      //console.log("Send burst");
      for (let j = 0; j < burstCount; j++) {
        ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null)
        .then((res) => {
          expect(res.status).to.be.equal(200);
          let resBody = res.data as any;
          expect(resBody.message).to.be.equal('Expecting larger payload on GET');
          expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
          responseCount++;
          if (responseCount === burstCount && runDuration) {
            setTimeout(() => sendBurst(burstCount), 25);
          }
        });
      }
    }
  });

  it('should not leak memory handling multiple GET requests for the same NTLM host with reconfiguration', function(done) {
    this.timeout(testTimeout);
    let runDuration = true;
    let burstCount = 5;
    ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig).then((res) => {
      expect(res.status).to.be.equal(200);
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

              expect(used2 - used1, 'Unexpected memory usage diff, possible memory leak').to.be.lessThan(1.0);
              return done();
            }, phaseFinalizeDuration);
          }, phaseDuration);
        }, phaseFinalizeDuration);
      }, phaseDuration);

      function sendBurst(burstCount: number) {
        let responseCount = 0;
        //console.log("Send burst");
        ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig).then((res) => {
          expect(res.status).to.be.equal(200);

          for (let j = 0; j < burstCount; j++) {
            ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null).then((res) => {
              expect(res.status).to.be.equal(200);
              let resBody = res.data as any;
              expect(resBody.message).to.be.equal('Expecting larger payload on GET');
              expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
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

            expect(used2 - used1, 'Unexpected memory usage diff, possible memory leak').to.be.lessThan(1.0);
            return done();
          }, phaseFinalizeDuration);
        }, phaseDuration);
      }, phaseFinalizeDuration);
    }, phaseDuration);

    function sendBurst(burstCount: number) {
      let responseCount = 0;
      //console.log("Send burst");
      for (let j = 0; j < burstCount; j++) {
        ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'GET', '/get', null).then((res) => {
          expect(res.status).to.be.equal(401);
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
  let dependencyInjection = new DependencyInjection();
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;

  before('Start HTTP server and proxy', async function() {
    if (!global || !global.gc) {
      throw new Error('Test must be executed with --expose-gc option');
    }
    savePortsFileStub = sinon.stub(PortsFileService.prototype, 'save');
    portsFileExistsStub = sinon.stub(PortsFileService.prototype, 'exists');
    portsFileExistsStub.returns(false);
    savePortsFileStub.returns(Promise.resolve());

    this.timeout(15000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(false, null);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(false, undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after('Stop HTTP server and proxy', async function() {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }

    await coreServer.stop(true);
    await expressServer.stopHttpServer();
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

            expect(used2 - used1, 'Unexpected memory usage diff, possible memory leak').to.be.lessThan(1.0);
            return done();
          }, phaseFinalizeDuration);
        }, phaseDuration);
      }, phaseFinalizeDuration);
    }, phaseDuration);


    function sendBurst(burstCount: number) {
      const body = {
        ntlmHost: 'https://my.test.host/'
      };
      let responseCount = 0;
      //console.log("Send burst");
      for (let j = 0; j < burstCount; j++) {
        ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, 'POST', '/post', body).then((res) => {
          expect(res.status).to.be.equal(200);
          let resBody = res.data as any;
          expect(resBody.ntlmHost).to.be.equal('https://my.test.host/');
          expect(resBody.reply).to.be.equal('OK ÅÄÖéß');
          responseCount++;
          if (responseCount === burstCount && runDuration) {
            setTimeout(() => sendBurst(burstCount), 25);
          }
        });
      }
    }
  });
});
