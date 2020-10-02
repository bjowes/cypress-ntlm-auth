import { DependencyInjection } from "./proxy/dependency.injection";
import { TYPES } from "./proxy/dependency.injection.types";
import { IStartup } from "./startup/interfaces/i.startup";
import { IDebugLogger } from "./util/interfaces/i.debug.logger";
import nodeCleanup from "node-cleanup";

const container = new DependencyInjection();
const startup = container.get<IStartup>(TYPES.IStartup);
const debug = container.get<IDebugLogger>(TYPES.IDebugLogger);

/**
 * Starts Cypress in headless mode with NTLM plugin
 * @param options An options object as defined by https://docs.cypress.io/guides/guides/module-api.html#Options
 */
export async function run(options: any) {
  return await startup.run(options);
}

/**
 * Starts Cypress in headed mode with NTLM plugin
 * @param options An options object as defined by https://docs.cypress.io/guides/guides/module-api.html#Options-1
 */
export async function open(options: any) {
  return await startup.open(options);
}

/**
 * Converts command line arguments to Cypress mode ('run' or 'open')
 * @param args command line arguments
 */
export function argumentsToCypressMode(args: string[]) {
  return startup.argumentsToCypressMode(args);
}

/**
 * Converts command line arguments to a Cypress options object.
 * @param args command line arguments
 */
export async function argumentsToOptions(args: string[]) {
  return await startup.prepareOptions(args);
}

// Unfortunately we can only catch these signals on Mac/Linux,
// Windows gets a hard exit
nodeCleanup((exitCode, signal) => {
  if (exitCode) {
    debug.log("Detected process exit with code", exitCode);
    // On a non-signal exit, we cannot postpone the process termination.
    // We try to cleanup but cannot be sure that the ports file was deleted.
    startup.stop();
  }
  if (signal) {
    debug.log("Detected termination signal", signal);
    // On signal exit, we postpone the process termination by returning false,
    // to ensure that cleanup has completed.
    (async () => {
      await startup.stop();
      process.kill(process.pid, signal);
    })();
    nodeCleanup.uninstall(); // don't call cleanup handler again
    return false;
  }
});
