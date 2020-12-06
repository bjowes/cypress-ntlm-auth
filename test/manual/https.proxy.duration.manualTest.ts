// cSpell:ignore nisse, mptst

// This test runs for a long time and is not suitable for test automation.
// Run test like this:
// node_modules/.bin/mocha  --require ./test/ts.hooks.js --require source-map-support/register test/manual/https.proxy.duration.manualTest.ts --expose-gc

import "mocha";

import { ProxyFacade } from "../proxy/proxy.facade";
import { expect } from "chai";
import { DependencyInjection } from "../../../src/proxy/dependency.injection";
import { TYPES } from "../../../src/proxy/dependency.injection.types";
import { ExpressServer } from "../proxy/express.server";
import sinon from "sinon";
import { PortsFileService } from "../../../src/util/ports.file.service";
import { ICoreServer } from "../../../src/proxy/interfaces/i.core.server";
import { PortsFile } from "../../../src/models/ports.file.model";
import { NtlmConfig } from "../../../src/models/ntlm.config.model";

let configApiUrl: string;
let ntlmProxyUrl: string;
let httpsUrl: string;
let savePortsFileStub: sinon.SinonStub<[PortsFile], Promise<void>>;
let portsFileExistsStub: sinon.SinonStub<[], boolean>;

const phaseDuration = 15000;
const phaseFinalizeDuration = 2000;
const testTimeout = (phaseDuration + phaseFinalizeDuration) * 2 + 5000;

describe("Duration test: Proxy for HTTPS host with NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let dependencyInjection = new DependencyInjection();
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;

  before("Start HTTPS server and proxy", async function () {
    if (!global || !global.gc) {
      throw new Error("Test must be executed with --expose-gc option");
    }

    savePortsFileStub = sinon.stub(PortsFileService.prototype, "save");
    portsFileExistsStub = sinon.stub(PortsFileService.prototype, "exists");
    portsFileExistsStub.returns(false);
    savePortsFileStub.returns(Promise.resolve());

    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl = await expressServer.startHttpsServer(true, null);
    ntlmHostConfig = {
      ntlmHost: httpsUrl,
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  after("Stop HTTPS server and proxy", async function () {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }

    await coreServer.stop();
    await expressServer.stopHttpsServer();
  });

  beforeEach("Reset NTLM config", async function () {
    this.timeout(5000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it("should not leak memory handling multiple GET requests for the same NTLM host", function (done) {
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
          console.log(
            `Phase 1: The script uses approximately ${used1.toFixed(
              3
            )} MB (${preGcUsed1.toFixed(3)} MB before GC)`
          );

          runDuration = true;
          sendBurst(burstCount);

          setTimeout(() => {
            runDuration = false;
            setTimeout(() => {
              // Await result
              const preGcUsed2 = process.memoryUsage().heapUsed / 1024 / 1024;
              global.gc();
              const used2 = process.memoryUsage().heapUsed / 1024 / 1024;
              console.log(
                `Phase 2: The script uses approximately ${used2.toFixed(
                  3
                )} MB (${preGcUsed2.toFixed(3)} before GC)`
              );

              expect(
                used2 - used1,
                "Unexpected memory usage diff, possible memory leak"
              ).to.be.lessThan(1.0);
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
        ProxyFacade.sendRemoteRequest(
          ntlmProxyUrl,
          httpsUrl,
          "GET",
          "/get",
          null,
          proxyFacade.mitmCaCert
        ).then((res) => {
          expect(res.status).to.be.equal(200);
          let resBody = res.data as any;
          expect(resBody.message).to.be.equal(
            "Expecting larger payload on GET"
          );
          expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
          responseCount++;
          if (responseCount === burstCount && runDuration) {
            setTimeout(() => sendBurst(burstCount), 25);
          }
        });
      }
    }
  });

  it("should not leak memory handling multiple GET requests for the same NTLM host with reconfiguration", function (done) {
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
          console.log(
            `Phase 1: The script uses approximately ${used1.toFixed(
              3
            )} MB (${preGcUsed1.toFixed(3)} MB before GC)`
          );

          runDuration = true;
          sendBurst(burstCount);

          setTimeout(() => {
            runDuration = false;
            setTimeout(() => {
              // Await result
              const preGcUsed2 = process.memoryUsage().heapUsed / 1024 / 1024;
              global.gc();
              const used2 = process.memoryUsage().heapUsed / 1024 / 1024;
              console.log(
                `Phase 2: The script uses approximately ${used2.toFixed(
                  3
                )} MB (${preGcUsed2.toFixed(3)} before GC)`
              );

              expect(
                used2 - used1,
                "Unexpected memory usage diff, possible memory leak"
              ).to.be.lessThan(1.0);
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
            ProxyFacade.sendRemoteRequest(
              ntlmProxyUrl,
              httpsUrl,
              "GET",
              "/get",
              null,
              proxyFacade.mitmCaCert
            ).then((res) => {
              expect(res.status).to.be.equal(200);
              let resBody = res.data as any;
              expect(resBody.message).to.be.equal(
                "Expecting larger payload on GET"
              );
              expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
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

  it("should not leak memory handling multiple GET requests for a NTLM host without config", function (done) {
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
        console.log(
          `Phase 1: The script uses approximately ${used1.toFixed(
            3
          )} MB (${preGcUsed1.toFixed(3)} MB before GC)`
        );

        runDuration = true;
        sendBurst(burstCount);

        setTimeout(() => {
          runDuration = false;
          setTimeout(() => {
            // Await result
            const preGcUsed2 = process.memoryUsage().heapUsed / 1024 / 1024;
            global.gc();
            const used2 = process.memoryUsage().heapUsed / 1024 / 1024;
            console.log(
              `Phase 2: The script uses approximately ${used2.toFixed(
                3
              )} MB (${preGcUsed2.toFixed(3)} before GC)`
            );

            expect(
              used2 - used1,
              "Unexpected memory usage diff, possible memory leak"
            ).to.be.lessThan(1.0);
            return done();
          }, phaseFinalizeDuration);
        }, phaseDuration);
      }, phaseFinalizeDuration);
    }, phaseDuration);

    function sendBurst(burstCount: number) {
      let responseCount = 0;
      //console.log("Send burst");
      for (let j = 0; j < burstCount; j++) {
        ProxyFacade.sendRemoteRequest(
          ntlmProxyUrl,
          httpsUrl,
          "GET",
          "/get",
          null,
          expressServer.caCert
        ).then((res) => {
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

describe("Duration test: Proxy for HTTPS host without NTLM", function () {
  let dependencyInjection = new DependencyInjection();
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;

  before("Start HTTPS server and proxy", async function () {
    if (!global || !global.gc) {
      throw new Error("Test must be executed with --expose-gc option");
    }
    savePortsFileStub = sinon.stub(PortsFileService.prototype, "save");
    portsFileExistsStub = sinon.stub(PortsFileService.prototype, "exists");
    portsFileExistsStub.returns(false);
    savePortsFileStub.returns(Promise.resolve());

    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl = await expressServer.startHttpsServer(false, null);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  beforeEach("Restore timeout", function () {
    this.timeout(5000);
  });

  after("Stop HTTPS server and proxy", async function () {
    if (savePortsFileStub) {
      savePortsFileStub.restore();
    }
    if (portsFileExistsStub) {
      portsFileExistsStub.restore();
    }

    await coreServer.stop();
    await expressServer.stopHttpsServer();
  });

  it("should not leak memory handling multiple GET requests for non NTLM host", function (done) {
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
        console.log(
          `Phase 1: The script uses approximately ${used1.toFixed(
            3
          )} MB (${preGcUsed1.toFixed(3)} MB before GC)`
        );

        runDuration = true;
        sendBurst(burstCount);

        setTimeout(() => {
          runDuration = false;
          setTimeout(() => {
            // Await result
            const preGcUsed2 = process.memoryUsage().heapUsed / 1024 / 1024;
            global.gc();
            const used2 = process.memoryUsage().heapUsed / 1024 / 1024;
            console.log(
              `Phase 2: The script uses approximately ${used2.toFixed(
                3
              )} MB (${preGcUsed2.toFixed(3)} before GC)`
            );

            expect(
              used2 - used1,
              "Unexpected memory usage diff, possible memory leak"
            ).to.be.lessThan(1.0);
            return done();
          }, phaseFinalizeDuration);
        }, phaseDuration);
      }, phaseFinalizeDuration);
    }, phaseDuration);

    function sendBurst(burstCount: number) {
      const body = {
        ntlmHost: "https://my.test.host/",
      };
      let responseCount = 0;
      //console.log("Send burst");
      for (let j = 0; j < burstCount; j++) {
        ProxyFacade.sendRemoteRequest(
          ntlmProxyUrl,
          httpsUrl,
          "POST",
          "/post",
          body,
          expressServer.caCert
        ).then((res) => {
          expect(res.status).to.be.equal(200);
          let resBody = res.data as any;
          expect(resBody.ntlmHost).to.be.equal("https://my.test.host/");
          expect(resBody.reply).to.be.equal("OK ÅÄÖéß");
          responseCount++;
          if (responseCount === burstCount && runDuration) {
            setTimeout(() => sendBurst(burstCount), 25);
          }
        });
      }
    }
  });
});
