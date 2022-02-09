// cSpell:ignore nisse, mptst

// This test runs for a long time and is not suitable for test automation.
// Run test like this:
// node_modules/.bin/mocha  --require ./test/ts.hooks.js --require source-map-support/register test/manual/https.proxy.duration.manualTest.ts --expose-gc

import { ProxyFacade } from "../unittest/proxy/proxy.facade";
import { DependencyInjection } from "../../src/proxy/dependency.injection";
import { TYPES } from "../../src/proxy/dependency.injection.types";
import { ExpressServer } from "../unittest/proxy/express.server";
import { ICoreServer } from "../../src/proxy/interfaces/i.core.server";
import { NtlmConfig } from "../../src/models/ntlm.config.model";
import { jest } from "@jest/globals";

let configApiUrl: string;
let ntlmProxyUrl: string;
let httpsUrl: string;

const phaseDuration = 15000;
const phaseFinalizeDuration = 2000;
const testTimeout = (phaseDuration + phaseFinalizeDuration) * 2 + 5000;

describe("Duration test: Proxy for HTTPS host with NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let dependencyInjection = new DependencyInjection();
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;

  beforeAll(async function () {
    // Start HTTPS server and proxy
    if (!global || !global.gc) {
      throw new Error("Test must be executed with --expose-gc option");
    }

    jest.setTimeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl = await expressServer.startHttpsServer(true, null);
    ntlmHostConfig = {
      ntlmHosts: [httpsUrl],
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

  after(async function () {
    // Stop HTTPS server and proxy
    await coreServer.stop();
    await expressServer.stopHttpsServer();
  });

  beforeEach(async function () {
    // Reset NTLM config
    jest.setTimeout(5000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it("should not leak memory handling multiple GET requests for the same NTLM host", function (done) {
    jest.setTimeout(testTimeout);
    let runDuration = true;
    let burstCount = 5;
    ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig).then((res) => {
      expect(res.status).to.equal(200);

      sendBurst(burstCount);

      setTimeout(() => {
        runDuration = false;
        setTimeout(() => {
          // Await result
          const preGcUsed1 = process.memoryUsage().heapUsed / 1024 / 1024;
          global.gc();
          const used1 = process.memoryUsage().heapUsed / 1024 / 1024;
          console.log(
            `Phase 1: The script uses approximately ${used1.toFixed(3)} MB (${preGcUsed1.toFixed(3)} MB before GC)`
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
                `Phase 2: The script uses approximately ${used2.toFixed(3)} MB (${preGcUsed2.toFixed(3)} before GC)`
              );

              // "Unexpected memory usage diff, possible memory leak"
              expect(used2 - used1).toBeLessThan(1.0);
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
        ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, proxyFacade.mitmCaCert).then(
          (res) => {
            expect(res.status).to.equal(200);
            let resBody = res.data as any;
            expect(resBody.message).to.equal("Expecting larger payload on GET");
            expect(resBody.reply).to.equal("OK ÅÄÖéß");
            responseCount++;
            if (responseCount === burstCount && runDuration) {
              setTimeout(() => sendBurst(burstCount), 25);
            }
          }
        );
      }
    }
  });

  it("should not leak memory handling multiple GET requests for the same NTLM host with reconfiguration", function (done) {
    jest.setTimeout(testTimeout);
    let runDuration = true;
    let burstCount = 5;
    ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig).then((res) => {
      expect(res.status).to.equal(200);
      sendBurst(burstCount);

      setTimeout(() => {
        runDuration = false;
        setTimeout(() => {
          // Await result
          const preGcUsed1 = process.memoryUsage().heapUsed / 1024 / 1024;
          global.gc();
          const used1 = process.memoryUsage().heapUsed / 1024 / 1024;
          console.log(
            `Phase 1: The script uses approximately ${used1.toFixed(3)} MB (${preGcUsed1.toFixed(3)} MB before GC)`
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
                `Phase 2: The script uses approximately ${used2.toFixed(3)} MB (${preGcUsed2.toFixed(3)} before GC)`
              );

              // "Unexpected memory usage diff, possible memory leak"
              expect(used2 - used1).toBeLessThan(1.0);
              return done();
            }, phaseFinalizeDuration);
          }, phaseDuration);
        }, phaseFinalizeDuration);
      }, phaseDuration);

      function sendBurst(burstCount: number) {
        let responseCount = 0;
        //console.log("Send burst");
        ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig).then((res) => {
          expect(res.status).to.equal(200);

          for (let j = 0; j < burstCount; j++) {
            ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, proxyFacade.mitmCaCert).then(
              (res) => {
                expect(res.status).to.equal(200);
                let resBody = res.data as any;
                expect(resBody.message).to.equal("Expecting larger payload on GET");
                expect(resBody.reply).to.equal("OK ÅÄÖéß");
                responseCount++;
                if (responseCount === burstCount && runDuration) {
                  setTimeout(() => sendBurst(burstCount), 25);
                }
              }
            );
          }
        });
      }
    });
  });

  it("should not leak memory handling multiple GET requests for a NTLM host without config", function (done) {
    jest.setTimeout(testTimeout);
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
          `Phase 1: The script uses approximately ${used1.toFixed(3)} MB (${preGcUsed1.toFixed(3)} MB before GC)`
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
              `Phase 2: The script uses approximately ${used2.toFixed(3)} MB (${preGcUsed2.toFixed(3)} before GC)`
            );

            // "Unexpected memory usage diff, possible memory leak"
            expect(used2 - used1).toBeLessThan(1.0);
            return done();
          }, phaseFinalizeDuration);
        }, phaseDuration);
      }, phaseFinalizeDuration);
    }, phaseDuration);

    function sendBurst(burstCount: number) {
      let responseCount = 0;
      //console.log("Send burst");
      for (let j = 0; j < burstCount; j++) {
        ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "GET", "/get", null, expressServer.caCert).then((res) => {
          expect(res.status).to.equal(401);
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

  beforeAll(async function () {
    // Start HTTPS server and proxy
    if (!global || !global.gc) {
      throw new Error("Test must be executed with --expose-gc option");
    }

    jest.setTimeout(30000);
    await proxyFacade.initMitmProxy();
    httpsUrl = await expressServer.startHttpsServer(false, null);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  beforeEach(function () {
    // Restore timeout
    jest.setTimeout(5000);
  });

  after(async function () {
    // Stop HTTPS server and proxy
    await coreServer.stop();
    await expressServer.stopHttpsServer();
  });

  it("should not leak memory handling multiple GET requests for non NTLM host", function (done) {
    jest.setTimeout(testTimeout);
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
          `Phase 1: The script uses approximately ${used1.toFixed(3)} MB (${preGcUsed1.toFixed(3)} MB before GC)`
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
              `Phase 2: The script uses approximately ${used2.toFixed(3)} MB (${preGcUsed2.toFixed(3)} before GC)`
            );

            // "Unexpected memory usage diff, possible memory leak"
            expect(used2 - used1).toBeLessThan(1.0);
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
        ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpsUrl, "POST", "/post", body, expressServer.caCert).then(
          (res) => {
            expect(res.status).to.equal(200);
            let resBody = res.data as any;
            expect(resBody.ntlmHost).to.equal("https://my.test.host/");
            expect(resBody.reply).to.equal("OK ÅÄÖéß");
            responseCount++;
            if (responseCount === burstCount && runDuration) {
              setTimeout(() => sendBurst(burstCount), 25);
            }
          }
        );
      }
    }
  });
});
