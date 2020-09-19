import { injectable } from "inversify";
import { ICypressNtlm } from "./interfaces/i.cypress.ntlm";

@injectable()
export class CypressNtlm implements ICypressNtlm {
  checkCypressIsInstalled(): boolean {
    try {
      const result = require.resolve("cypress");
      return result !== null && result !== undefined;
    } catch {
      return false;
    }
  }
}
