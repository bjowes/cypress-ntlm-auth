import { injectable } from "inversify";
import { ICypressFacade } from "./interfaces/i.cypress.facade";
import cypressLoader from "./cypress.loader.js";

@injectable()
export class CypressFacade implements ICypressFacade {
  private _cypress: CypressNpmModule.CypressNpmApi;

  constructor() {
    this._cypress = cypressLoader.cypress();
  }

  cypressLoaded() {
    return this._cypress !== null && this._cypress !== undefined;
  }

  async run(options: Partial<CypressCommandLine.CypressRunOptions>): Promise<CypressCommandLine.CypressRunResult | CypressCommandLine.CypressFailedRunResult> {
    return await this._cypress.run(options);
  }

  async open(options: Partial<CypressCommandLine.CypressOpenOptions>) {
    return await this._cypress.open(options);
  }

  async parseRunArguments(runArguments: string[]): Promise<Partial<CypressCommandLine.CypressRunOptions>> {
    return await this._cypress.cli.parseRunArguments(runArguments);
  }
}
