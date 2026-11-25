//import type { CypressFailedRunResult, CypressNpmApi, CypressOpenOptions, CypressRunOptions, CypressRunResult } from "./interfaces/i.cypress.facade.ts";
//import type { CypressNpmApi } from "cypress";
//import type { ICypressFacade } from "./interfaces/i.cypress.facade.ts";
/*
/// <reference types="cypress" />
/// <reference path="./node_modules/cypress/types/cypress-npm-api.d.ts" />
*/
import * as CypressNpmApi from 'cypress';
import type { ICypressFacade } from './interfaces/i.cypress.facade.ts';
//import CypressNpmApi from "cypress";

//let cypressNpmApi: CypressNpmApi;
/*
try {
  let cypressNpmApi = await import("cypress");
} catch {
  // TODO bjowes
}
*/
/**
 * Facade for Cypress
 */
export class CypressFacade implements ICypressFacade {
  //private _cypress?: CypressNpmApi;

  /**
   * Constructor
   */
  constructor() {
    //this._cypress = cypressNpmApi;
  }

  /**
   * Try to resolve Cypress
   * @returns Cypress object
   */
  /*
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
    */

  /**
   * Check if Cypress could be loaded
   * @returns True if Cypress is loaded
   */
  cypressLoaded() { return true;
    //return this._cypress !== null && this._cypress !== undefined;
  }

  /**
   * Run tests in Cypress
   * @param options Cypress run options
   * @returns Run results
   */
  async run(options: Partial<CypressCommandLine.CypressRunOptions>): Promise<CypressCommandLine.CypressRunResult | CypressCommandLine.CypressFailedRunResult> {
    return await CypressNpmApi.run(options);
  }

  /**
   * Open Cypress UI
   * @param options Cypress open options
   * @returns Awaitable
   */
  async open(options: Partial<CypressCommandLine.CypressOpenOptions>): Promise<void> {
    return await CypressNpmApi.open(options);
  }

  /**
   * Parse command line arguments into Cypress options
   * @param runArguments command line arguments
   * @returns Parsed Cypress options
   */
  async parseRunArguments(runArguments: string[]): Promise<Partial<CypressCommandLine.CypressRunOptions>> {
    return await CypressNpmApi.cli.parseRunArguments(runArguments);
  }
}
