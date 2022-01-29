import { injectable } from "inversify";
import { ICypressFacade } from "./interfaces/i.cypress.facade.js";
import cypressLoader from "./cypress.loader.cjs";

@injectable()
export class CypressFacade implements ICypressFacade {
  private _cypress: any;

  constructor() {
    this._cypress = cypressLoader.cypress();
  }

  cypressLoaded() {
    return this._cypress !== null && this._cypress !== undefined;
  }

  async run(options: any) {
    return await this._cypress.run(options);
  }

  async open(options: any) {
    return await this._cypress.open(options);
  }

  async parseRunArguments(runArguments: string[]) {
    return await this._cypress.cli.parseRunArguments(runArguments);
  }
}
