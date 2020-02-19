import { DependencyInjection } from "./proxy/dependency.injection";
import { TYPES } from "./proxy/dependency.injection.types";
import { IMain } from "./proxy/interfaces/i.main";
import { ICypressNtlm } from "./util/interfaces/i.cypress.ntlm";
import { IDebugLogger } from "./util/interfaces/i.debug.logger";
import { IUpstreamProxyConfigurator } from "./util/interfaces/i.upstream.proxy.configurator";
import nodeCleanup from "node-cleanup";

const container = new DependencyInjection();
let cypressNtlm = container.get<ICypressNtlm>(TYPES.ICypressNtlm);
let proxyMain = container.get<IMain>(TYPES.IMain);
let debug = container.get<IDebugLogger>(TYPES.IDebugLogger);
const upstreamProxyConfigurator = container.get<IUpstreamProxyConfigurator>(
  TYPES.IUpstreamProxyConfigurator
);

export async function run(options: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (cypressNtlm.checkCypressIsInstalled() === false) {
      throw new Error("cypress-ntlm-auth requires Cypress to be installed.");
    }
    upstreamProxyConfigurator.processNoProxyLoopback();
    debug.log("Starting ntlm-proxy...");
    proxyMain
      .run(
        false,
        process.env.HTTP_PROXY,
        process.env.HTTPS_PROXY,
        process.env.NO_PROXY
      )
      .then(() => {
        cypressNtlm.checkProxyIsRunning(15000, 200).then(portsFile => {
          process.env.HTTP_PROXY = portsFile.ntlmProxyUrl;
          process.env.NO_PROXY = "<-loopback>";
          upstreamProxyConfigurator.removeUnusedProxyEnv();

          debug.log("ntlm-proxy started, running tests through Cypress...");
          // Start up Cypress and let it parse any options
          const cypress = require("cypress");
          cypress
            .run(options)
            .then((result: any) => {
              debug.log("Tests finished, stopping ntlm-proxy...");
              proxyMain.stop().then(() => resolve(result));
            })
            .catch((err: any) => {
              debug.log("Test exception, stopping ntlm-proxy...");
              proxyMain.stop().then(() => reject(err));
            });
        });
      });
  });
}

// Unfortunately we can only catch these signals on Mac/Linux,
// Windows gets a hard exit => the portsFile is left behind,
// but will be replaced on next start
nodeCleanup((exitCode, signal) => {
  if (exitCode) {
    debug.log("Detected process exit with code", exitCode);
    // On a non-signal exit, we cannot postpone the process termination.
    // We try to cleanup but cannot be sure that the ports file was deleted.
    proxyMain.stop();
  }
  if (signal) {
    debug.log("Detected termination signal", signal);
    // On signal exit, we postpone the process termination by returning false,
    // to ensure that cleanup has completed.
    (async () => {
      await proxyMain.stop();
      process.kill(process.pid, signal);
    })();
    nodeCleanup.uninstall(); // don't call cleanup handler again
    return false;
  }
});
