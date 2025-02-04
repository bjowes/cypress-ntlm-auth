import { injectable } from "inversify";
import { CypressFailedRunResult, CypressNpmApi, CypressOpenOptions, CypressRunOptions, CypressRunResult, ICypressFacade } from "./interfaces/i.cypress.facade";

/**
 * Facade for Cypress
 */
@injectable()
export class CypressFacade implements ICypressFacade {
  private _cypress?: CypressNpmApi;

  /**
   * Constructor
   */
  constructor() {
    this._cypress = this.initCypress();
  }

  /**
   * Try to resolve Cypress
   * @returns Cypress object
   */
  initCypress() {
    if (this._cypress === undefined) {
      try {
        const canResolve = require.resolve("cypress");
        if (canResolve !== null && canResolve !== undefined) {
          this._cypress = require("cypress");
        }
      } catch {
        this._cypress = undefined;
      }
    }
    return this._cypress;
  }

  /**
   * Check if Cypress could be loaded
   * @returns True if Cypress is loaded
   */
  cypressLoaded() {
    return this._cypress !== null && this._cypress !== undefined;
  }

  /**
   * Run tests in Cypress
   * @param options Cypress run options
   * @returns Run results
   */
  async run(options: Partial<CypressRunOptions>): Promise<CypressRunResult | CypressFailedRunResult> {
    return await this._cypress!.run(options);
  }

  /**
   * Open Cypress UI
   * @param options Cypress open options
   * @returns Awaitable
   */
  async open(options: Partial<CypressOpenOptions>): Promise<void> {
    return await this._cypress!.open(options);
  }

  /**
   * Parse command line arguments into Cypress options
   * @param runArguments command line arguments
   * @returns Parsed Cypress options
   */
  async parseRunArguments(runArguments: string[]): Promise<Partial<CypressRunOptions>> {
    return await this._cypress!.cli.parseRunArguments(runArguments);
  }
}
