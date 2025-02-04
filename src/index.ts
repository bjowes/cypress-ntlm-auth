import { DependencyInjection } from "./proxy/dependency.injection";
import { TYPES } from "./proxy/dependency.injection.types";
import { IStartup } from "./startup/interfaces/i.startup";
import { NtlmProxy } from "./ntlm-proxy";
import { INtlmProxyFacade } from "./startup/interfaces/i.ntlm.proxy.facade";
import { IEnvironment } from "./startup/interfaces/i.environment";
import { CypressFailedRunResult, CypressOpenOptions, CypressRunOptions, CypressRunResult } from "./startup/interfaces/i.cypress.facade";

const container = new DependencyInjection();
const startup = container.get<IStartup>(TYPES.IStartup);
const environment = container.get<IEnvironment>(TYPES.IEnvironment);
const ntlmProxyFacade = container.get<INtlmProxyFacade>(TYPES.INtlmProxyFacade);

/**
 * Starts Cypress in headless mode with NTLM plugin
 * @param options An options object as defined by https://docs.cypress.io/guides/guides/module-api.html#Options
 * @returns Test results as defined by https://docs.cypress.io/guides/guides/module-api.html#Results
 */
export async function run(options: Partial<CypressRunOptions>): Promise<CypressRunResult | CypressFailedRunResult> {
  return await startup.run(options);
}

/**
 * Starts Cypress in headed mode with NTLM plugin
 * @param options An options object as defined by https://docs.cypress.io/guides/guides/module-api.html#Options-1
 * @returns Test results
 */
export async function open(options: Partial<CypressOpenOptions>) {
  return await startup.open(options);
}

/**
 * Converts command line arguments to Cypress mode ('run' or 'open')
 * @param args command line arguments
 * @returns 'run' or 'open'
 */
export function argumentsToCypressMode(args: string[]) {
  return startup.argumentsToCypressMode(args);
}

/**
 * Converts command line arguments to a Cypress options object.
 * @param args command line arguments
 * @returns An options object for the run() or open() methods
 */
export async function argumentsToOptions(args: string[]): Promise<Partial<CypressRunOptions>> {
  return await startup.prepareOptions(args);
}

/**
 * Starts a new ntlm-proxy
 * @returns The created NtlmProxy
 */
export async function startNtlmProxy(): Promise<NtlmProxy> {
  // Create a new root instance for each ntlm-proxy
  const startup = container.get<IStartup>(TYPES.IStartup);
  const ports = await startup.startNtlmProxy();
  return new NtlmProxy(ports, ntlmProxyFacade);
}

/**
 * Stop a running ntlm-proxy, uses environment variable to find the config API url
 * @returns True if the proxy was stopped, false if there was not response or the proxy does not exist.
 */
export async function stopNtlmProxy(): Promise<boolean> {
  if (!environment.configApiUrl) {
    console.info("CYPRESS_NTLM_AUTH_API environment variable not set");
    return false;
  }
  return await ntlmProxyFacade.quitIfRunning(environment.configApiUrl);
}
