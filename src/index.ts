import { DependencyInjection } from "./proxy/dependency.injection";
import { TYPES } from "./proxy/dependency.injection.types";
import { IStartup } from "./startup/interfaces/i.startup";
import { IDebugLogger } from "./util/interfaces/i.debug.logger";
import nodeCleanup from "node-cleanup";

const container = new DependencyInjection();
const startup = container.get<IStartup>(TYPES.IStartup);
const debug = container.get<IDebugLogger>(TYPES.IDebugLogger);

export async function run(options: any) {
  return await startup.run(options);
}

export async function open(options: any) {
  return await startup.open(options);
}

export function argumentsToCypressMode(args: string[]) {
  return startup.argumentsToCypressMode(args);
}

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
