// cSpell:ignore nisse, mptst

// This test runs for a long time and is not suitable for test automation.
// Run test like this:
// node --expose-gc node_modules/.bin/mocha test/manual/http.proxy.duration.spec.ts

import { ProxyFacade } from "../unittest/proxy/proxy.facade";
import { DependencyInjection } from "../../src/proxy/dependency.injection";
import { TYPES } from "../../src/proxy/dependency.injection.types";
import { ExpressServer } from "../unittest/proxy/express.server";
import { ICoreServer } from "../../src/proxy/interfaces/i.core.server";
import { NtlmConfig } from "../../src/models/ntlm.config.model";
import assert from "assert";

let configApiUrl: URL;
let ntlmProxyUrl: URL;
let httpUrl: URL;

const phaseDuration = 15000;
const phaseFinalizeDuration = 2000;
const testTimeout = (phaseDuration + phaseFinalizeDuration) * 2 + 5000;

describe("Duration test: Proxy for HTTP host with NTLM", function () {
  let ntlmHostConfig: NtlmConfig;
  let dependencyInjection = new DependencyInjection();
  let proxyFacade = new ProxyFacade();
  let expressServer = new ExpressServer();
  let coreServer: ICoreServer;

  // "Start HTTP server and proxy",
  before(async function () {
    if (!global || !global.gc) {
      throw new Error("Test must be executed with --expose-gc option");
    }

    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(true, null);
    ntlmHostConfig = {
      ntlmHosts: [httpUrl.host],
      username: "nisse",
      password: "manpower",
      domain: "mptst",
      ntlmVersion: 2,
    };
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = new URL(ports.configApiUrl);
    ntlmProxyUrl = new URL(ports.ntlmProxyUrl);
  });

  // "Stop HTTP server and proxy"
  after(async function () {
    await coreServer.stop();
    await expressServer.stopHttpServer();
  });

  // "Reset NTLM config"
  beforeEach(async function () {
    this.timeout(5000);
    await proxyFacade.sendNtlmReset(configApiUrl);
  });

  it("should not leak memory handling multiple GET requests for the same NTLM host", function (done) {
    this.timeout(testTimeout);
    let runDuration = true;
    let burstCount = 5;
    proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig).then((res) => {
      assert.equal(res.status, 200);

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

              // "Unexpected memory usage diff, possible memory leak"
              assert.ok(used2 - used1 < 1.0);
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
        proxyFacade.sendProxiedHttpRequest(
          ntlmProxyUrl,
          httpUrl,
          "GET",
          "/get",
          null
        ).then((res) => {
          assert.equal(res.status, 200);
          let resBody = res.data as any;
          assert.equal(resBody.message, "Expecting larger payload on GET");
          assert.equal(resBody.reply, "OK ÅÄÖéß");
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
    proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig).then((res) => {
      assert.equal(res.status, 200);
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

              // "Unexpected memory usage diff, possible memory leak"
              assert.ok(used2 - used1 < 1.0);
              return done();
            }, phaseFinalizeDuration);
          }, phaseDuration);
        }, phaseFinalizeDuration);
      }, phaseDuration);

      function sendBurst(burstCount: number) {
        let responseCount = 0;
        //console.log("Send burst");
        proxyFacade.sendNtlmConfig(configApiUrl, ntlmHostConfig).then((res) => {
          assert.equal(res.status, 200);

          for (let j = 0; j < burstCount; j++) {
            proxyFacade.sendProxiedHttpRequest(
              ntlmProxyUrl,
              httpUrl,
              "GET",
              "/get",
              null
            ).then((res) => {
              assert.equal(res.status, 200);
              let resBody = res.data as any;
              assert.equal(resBody.message, "Expecting larger payload on GET");
              assert.equal(resBody.reply, "OK ÅÄÖéß");
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

            // "Unexpected memory usage diff, possible memory leak"
            assert.ok(used2 - used1 < 1.0);
            return done();
          }, phaseFinalizeDuration);
        }, phaseDuration);
      }, phaseFinalizeDuration);
    }, phaseDuration);

    function sendBurst(burstCount: number) {
      let responseCount = 0;
      //console.log("Send burst");
      for (let j = 0; j < burstCount; j++) {
        proxyFacade.sendProxiedHttpRequest(
          ntlmProxyUrl,
          httpUrl,
          "GET",
          "/get",
          null
        ).then((res) => {
          assert.equal(res.status, 401);
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
  before(async function () {
    if (!global || !global.gc) {
      throw new Error("Test must be executed with --expose-gc option");
    }

    this.timeout(30000);
    await proxyFacade.initMitmProxy();
    httpUrl = await expressServer.startHttpServer(false, null);
    coreServer = dependencyInjection.get<ICoreServer>(TYPES.ICoreServer);
    let ports = await coreServer.start(undefined, undefined, undefined);
    configApiUrl = new URL(ports.configApiUrl);
    ntlmProxyUrl = new URL(ports.ntlmProxyUrl);
  });

  // "Restore timeout"
  beforeEach(function () {
    this.timeout(5000);
  });

  // "Stop HTTP server and proxy"
  after(async function () {
    await coreServer.stop();
    await expressServer.stopHttpServer();
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

            // "Unexpected memory usage diff, possible memory leak"
            assert.ok(used2 - used1 < 1.0);
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
        proxyFacade.sendProxiedHttpRequest(
          ntlmProxyUrl,
          httpUrl,
          "POST",
          "/post",
          body
        ).then((res) => {
          assert.equal(res.status, 200);
          let resBody = res.data as any;
          assert.equal(resBody.ntlmHost, "https://my.test.host/");
          assert.equal(resBody.reply, "OK ÅÄÖéß");
          responseCount++;
          if (responseCount === burstCount && runDuration) {
            setTimeout(() => sendBurst(burstCount), 25);
          }
        });
      }
    }
  });
});
