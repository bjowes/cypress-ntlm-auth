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
export let debug = container.get<IDebugLogger>(TYPES.IDebugLogger);
const upstreamProxyConfigurator = container.get<IUpstreamProxyConfigurator>(
  TYPES.IUpstreamProxyConfigurator
);

export function checkCypressIsInstalled() {
  if (cypressNtlm.checkCypressIsInstalled() === false) {
    throw new Error("cypress-ntlm-auth requires Cypress to be installed.");
  }
}

async function prepareProxy() {
  checkCypressIsInstalled();
  upstreamProxyConfigurator.processNoProxyLoopback();

  if (
    process.env.CYPRESS_NTLM_AUTH_PROXY &&
    process.env.CYPRESS_NTLM_AUTH_API
  ) {
    debug.log(
      "Detected ntlm-proxy environment variables, using existing ntlm-proxy"
    );
  } else {
    debug.log("Starting ntlm-proxy...");
    let ports = await proxyMain.run(
      process.env.HTTP_PROXY,
      process.env.HTTPS_PROXY,
      process.env.NO_PROXY
    );
    process.env.CYPRESS_NTLM_AUTH_PROXY = ports.ntlmProxyUrl;
    process.env.CYPRESS_NTLM_AUTH_API = ports.configApiUrl;
  }

  process.env.HTTP_PROXY = process.env.CYPRESS_NTLM_AUTH_PROXY;
  process.env.HTTPS_PROXY = process.env.CYPRESS_NTLM_AUTH_PROXY;
  process.env.NO_PROXY = "<-loopback>";
  upstreamProxyConfigurator.removeUnusedProxyEnv();
}

export async function run(options: any) {
  await prepareProxy();
  debug.log("Running tests through Cypress...");
  // Start up Cypress and let it parse any options
  try {
    const cypress = require("cypress");
    const result = await cypress.run(options);
    debug.log("Tests finished");
    debug.log(result);
    return result;
  } catch (err) {
    debug.log("Tests exception");
    throw err;
  } finally {
    debug.log("Stopping ntlm-proxy...");
    await proxyMain.stop();
  }
}

export async function open(options: any) {
  await prepareProxy();
  debug.log("Opening Cypress...");
  // Start up Cypress and let it parse any options
  try {
    const cypress = require("cypress");
    const result = await cypress.open(options);
    debug.log("Tests finished");
    debug.log(result);
    return result;
  } catch (err) {
    debug.log("Tests exception");
    throw err;
  } finally {
    debug.log("Stopping ntlm-proxy...");
    await proxyMain.stop();
  }
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
