// cSpell:ignore nisse, mptst

// This test runs for a long time and is not suitable for test automation.
// Run test like this:
// node_modules/.bin/mocha  --require ./test/ts.hooks.js --require source-map-support/register test/manual/http.proxy.duration.manualTest.ts --expose-gc

import { ProxyFacade } from "../unittest/proxy/proxy.facade";
import { DependencyInjection } from "../../src/proxy/dependency.injection";
import { TYPES } from "../../src/proxy/dependency.injection.types";
import { ExpressServer } from "../unittest/proxy/express.server";
import { ICoreServer } from "../../src/proxy/interfaces/i.core.server";
import { NtlmConfig } from "../../src/models/ntlm.config.model";
import { jest } from "@jest/globals";

let configApiUrl: string;
let ntlmProxyUrl: string;
let httpUrl: string;

const phaseDuration = 1500;
const phaseFinalizeDuration = 2000;
const testTimeout = (phaseDuration + phaseFinalizeDuration) * 2 + 5000;

describe("Duration test: Proxy for HTTP host with NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let dependencyInjection = new DependencyInjection();
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;

  // "Start HTTP server and proxy",
  beforeAll(async function () {
    if (!global || !global.gc) {
      throw new Error("Test must be executed with --expose-gc option");
    }

    jest.setTimeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(true, null);
    ntlmHostConfig = {
      ntlmHosts: [httpUrl],
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

  // "Stop HTTP server and proxy"
  afterAll(async function () {
    await coreServer.stop();
    await expressServer.stopHttpServer();
  });

  // "Reset NTLM config"
  beforeEach(async function () {
    jest.setTimeout(5000);
    await ProxyFacade.sendNtlmReset(configApiUrl);
  });

  it("should not leak memory handling multiple GET requests for the same NTLM host", function (done) {
    jest.setTimeout(testTimeout);
    let runDuration = true;
    let burstCount = 5;
    ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig).then((res) => {
      expect(res.status).toEqual(200);

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
        ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null).then((res) => {
          expect(res.status).toEqual(200);
          let resBody = res.data as any;
          expect(resBody.message).toEqual("Expecting larger payload on GET");
          expect(resBody.reply).toEqual("OK ÅÄÖéß");
          responseCount++;
          if (responseCount === burstCount && runDuration) {
            setTimeout(() => sendBurst(burstCount), 25);
          }
        });
      }
    }
  });

  it("should not leak memory handling multiple GET requests for the same NTLM host with reconfiguration", function (done) {
    jest.setTimeout(testTimeout);
    let runDuration = true;
    let burstCount = 5;
    ProxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig).then((res) => {
      expect(res.status).toEqual(200);
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
          expect(res.status).toEqual(200);

          for (let j = 0; j < burstCount; j++) {
            ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null).then((res) => {
              expect(res.status).toEqual(200);
              let resBody = res.data as any;
              expect(resBody.message).toEqual("Expecting larger payload on GET");
              expect(resBody.reply).toEqual("OK ÅÄÖéß");
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
        ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "GET", "/get", null).then((res) => {
          expect(res.status).toEqual(401);
          responseCount++;
          if (responseCount === burstCount && runDuration) {
            setTimeout(() => sendBurst(burstCount), 25);
          }
        });
      }
    }
  });
});

describe("Duration test: Proxy for HTTP host without NTLM", function () {
  let dependencyInjection = new DependencyInjection();
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;

  //"Start HTTP server and proxy"
  beforeAll(async function () {
    if (!global || !global.gc) {
      throw new Error("Test must be executed with --expose-gc option");
    }

    jest.setTimeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(false, null);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = ports.configApiUrl;
    ntlmProxyUrl = ports.ntlmProxyUrl;
  });

  // "Restore timeout"
  beforeEach(function () {
    jest.setTimeout(5000);
  });

  // "Stop HTTP server and proxy"
  afterAll(async function () {
    await coreServer.stop();
    await expressServer.stopHttpServer();
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
        ProxyFacade.sendRemoteRequest(ntlmProxyUrl, httpUrl, "POST", "/post", body).then((res) => {
          expect(res.status).toEqual(200);
          let resBody = res.data as any;
          expect(resBody.ntlmHost).toEqual("https://my.test.host/");
          expect(resBody.reply).toEqual("OK ÅÄÖéß");
          responseCount++;
          if (responseCount === burstCount && runDuration) {
            setTimeout(() => sendBurst(burstCount), 25);
          }
        });
      }
    }
  });
});
