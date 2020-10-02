import { injectable } from "inversify";
import { ICypressFacade } from "./interfaces/i.cypress.facade";

@injectable()
export class CypressFacade implements ICypressFacade {
  private _cypress: any;

  constructor() {
    try {
      let canResolve = require.resolve("cypress");
      if (canResolve !== null && canResolve !== undefined) {
        this._cypress = require("cypress");
      }
    } catch {
      this._cypress = undefined;
    }
  }

  cypressLoaded(): boolean {
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
