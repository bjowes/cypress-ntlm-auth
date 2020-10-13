import { DependencyInjection } from "./proxy/dependency.injection";
import { TYPES } from "./proxy/dependency.injection.types";
import { IStartup } from "./startup/interfaces/i.startup";
import { IDebugLogger } from "./util/interfaces/i.debug.logger";
import { PortsConfig } from "./models/ports.config.model";

const container = new DependencyInjection();
const startup = container.get<IStartup>(TYPES.IStartup);
const debug = container.get<IDebugLogger>(TYPES.IDebugLogger);

/**
 * Starts ntlm-proxy
 * @param options An options object as defined by https://docs.cypress.io/guides/guides/module-api.html#Options
 */
export async function start(options: any): Promise<PortsConfig> {
  return await startup.startNtlmProxy();
}

/**
 * Stops ntlm-proxy
 */
export async function stop() {
  return await startup.stopNtlmProxy();
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
