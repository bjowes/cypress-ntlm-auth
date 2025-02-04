import { injectable, inject } from "inversify";
import { IStartup } from "./interfaces/i.startup";
import { TYPES } from "../proxy/dependency.injection.types";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { IUpstreamProxyConfigurator } from "./interfaces/i.upstream.proxy.configurator";
import { IMain } from "../proxy/interfaces/i.main";
import { CypressFailedRunResult, CypressOpenOptions, CypressRunOptions, CypressRunResult, ICypressFacade } from "./interfaces/i.cypress.facade";
import { INtlmProxyFacade } from "./interfaces/i.ntlm.proxy.facade";
import { IEnvironment } from "./interfaces/i.environment";
import { PortsConfig } from "../models/ports.config.model";

/**
 * NTLM proxy startup manager
 */
@injectable()
export class Startup implements IStartup {
  private _upstreamProxyConfigurator: IUpstreamProxyConfigurator;
  private _proxyMain: IMain;
  private _cypressFacade: ICypressFacade;
  private _environment: IEnvironment;
  private _externalNtlmProxyFacade: INtlmProxyFacade;
  private _debug: IDebugLogger;
  private _internalNtlmProxy = true;

  /**
   * Constructor
   * @param upstreamProxyConfigurator Upstream proxy configurator
   * @param proxyMain Proxy main
   * @param cypressFacade Cypress facade
   * @param environment Environment variable access
   * @param externalNtlmProxyFacade External proxy facade
   * @param debug Debug logger
   */
  constructor(
    @inject(TYPES.IUpstreamProxyConfigurator)
    upstreamProxyConfigurator: IUpstreamProxyConfigurator,
    @inject(TYPES.IMain) proxyMain: IMain,
    @inject(TYPES.ICypressFacade) cypressFacade: ICypressFacade,
    @inject(TYPES.IEnvironment) environment: IEnvironment,
    @inject(TYPES.INtlmProxyFacade)
    externalNtlmProxyFacade: INtlmProxyFacade,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger
  ) {
    this._upstreamProxyConfigurator = upstreamProxyConfigurator;
    this._proxyMain = proxyMain;
    this._cypressFacade = cypressFacade;
    this._environment = environment;
    this._externalNtlmProxyFacade = externalNtlmProxyFacade;
    this._debug = debug;
  }

  private checkCypressIsInstalled() {
    if (this._cypressFacade.cypressLoaded() === false) {
      throw new Error("cypress-ntlm-auth requires Cypress to be installed.");
    }
  }

  private getArgsAfterCypressNtlm(args: string[]) {
    const cypressNtlmIndex = args.findIndex(
      (t) =>
        t === "cypress-ntlm" ||
        t === "cypress.ntlm.js" ||
        t.endsWith("/cypress-ntlm") ||
        t.endsWith("/cypress.ntlm.js") ||
        t.endsWith("\\cypress-ntlm") ||
        t.endsWith("\\cypress.ntlm.js")
    );
    if (cypressNtlmIndex === -1) {
      this._debug.log(args);
      throw new Error("Cannot parse command line arguments");
    }
    return args.slice(cypressNtlmIndex + 1);
  }

  /**
   * Converts command line arguments to cypress mode
   * @param args command line arguments
   * @returns "run" or "open"
   */
  argumentsToCypressMode(args: string[]) {
    const cliArguments = this.getArgsAfterCypressNtlm(args);
    if (cliArguments.length > 0 && (cliArguments[0] === "run" || cliArguments[0] === "open")) {
      return cliArguments[0];
    }
    throw new Error("Unsupported command, use cypress-ntlm open or cypress-ntlm run.");
  }

  /**
   * Parse command line options for cypress
   * @param args command line arguments
   * @returns Parsed command line options
   */
  async prepareOptions(args: string[]): Promise<Partial<CypressRunOptions>> {
    this.checkCypressIsInstalled();
    let cliArguments = this.getArgsAfterCypressNtlm(args);
    cliArguments = cliArguments.slice(1);
    cliArguments.unshift("run");
    cliArguments.unshift("cypress");
    return await this._cypressFacade.parseRunArguments(cliArguments);
  }

  private async prepareProxy() {
    this._environment.validateEnvironmentUrls();
    let ports: PortsConfig;
    if (this._environment.configApiUrl) {
      ports = await this.prepareExternalNtlmProxy();
    } else {
      ports = await this.startNtlmProxy();
    }
    this._environment.configureForCypress(ports);
    this._upstreamProxyConfigurator.removeUnusedProxyEnv();
  }

  private async prepareExternalNtlmProxy(): Promise<PortsConfig> {
    this._internalNtlmProxy = false;
    this._upstreamProxyConfigurator.processNoProxyLoopback();
    this._debug.log("Detected CYPRESS_NTLM_AUTH_API environment variable, using existing ntlm-proxy");
    return await this._externalNtlmProxyFacade.alive(this._environment.configApiUrl);
  }

  /**
   * Starts the NTML proxy
   * @returns Port config
   */
  async startNtlmProxy(): Promise<PortsConfig> {
    this._internalNtlmProxy = true;
    this._upstreamProxyConfigurator.processNoProxyLoopback();
    this._debug.log("Starting ntlm-proxy...");
    return await this._proxyMain.run(
      this._environment.httpProxy,
      this._environment.httpsProxy,
      this._environment.noProxy,
      this._environment.configApiPort,
      this._environment.ntlmProxyPort
    );
  }

  /**
   * Run tests in Cypress
   * @param options Cypress options 
   * @returns Run result
   */
  async run(options: CypressRunOptions): Promise<CypressRunResult | CypressFailedRunResult> {
    this.checkCypressIsInstalled();
    await this.prepareProxy();
    this._debug.log("Running tests through Cypress...");
    // Start up Cypress and let it parse any options
    try {
      const result = await this._cypressFacade.run(options);
      this._debug.log("Tests finished");
      this._debug.log(result);
      return result;
    } catch (err) {
      this._debug.log("Tests exception");
      throw err;
    } finally {
      await this.stopNtlmProxy();
    }
  }

  /**
   * Open Cypress UI
   * @param options Cypress options
   */
  async open(options: CypressOpenOptions): Promise<void> {
    this.checkCypressIsInstalled();
    await this.prepareProxy();
    this._debug.log("Opening Cypress...");
    try {
      await this._cypressFacade.open(options);
      this._debug.log("Cypress closed");
    } catch (err) {
      this._debug.log("Tests exception");
      throw err;
    } finally {
      await this.stopNtlmProxy();
    }
  }

  private async stopNtlmProxy() {
    if (this._internalNtlmProxy) {
      this._debug.log("Stopping ntlm-proxy...");
      await this._proxyMain.stop();
    }
  }
}
