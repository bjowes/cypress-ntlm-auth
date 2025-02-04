import debugInit from "debug";
import { injectable } from "inversify";
import { IDebugLogger } from "./interfaces/i.debug.logger";

const debug = debugInit("cypress:plugin:ntlm-auth");

/**
 * Debug logger
 */
@injectable()
export class DebugLogger implements IDebugLogger {
  /**
   * Log formatted message to debug
   * @param formatter formatting string
   * @param args optional arguments
   */
  log(formatter: string | object | undefined, ...args: unknown[]) {
    debug(formatter, ...args);
  }
}
