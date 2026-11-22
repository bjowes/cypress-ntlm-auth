import debugInit from "debug";
import type IDebugLogger from "./interfaces/i.debug.logger.ts";

const debug = debugInit("cypress:plugin:ntlm-auth");

/**
 * Debug logger
 */
export default class DebugLogger implements IDebugLogger {
  /**
   * Log formatted message to debug
   * @param formatter formatting string
   * @param args optional arguments
   */
  log(formatter: string | object | undefined, ...args: unknown[]) {
    debug(formatter, ...args);
  }
}
