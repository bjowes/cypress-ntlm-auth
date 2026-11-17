import { injectable } from "inversify";
import type { IConsoleLogger } from "./interfaces/i.console.logger.ts";

/**
 * Console logger
 */
@injectable()
export class ConsoleLogger implements IConsoleLogger {
  /**
   * Log formatted message to console
   * @param formatter formatting string
   * @param args optional arguments
   */
  warn(formatter: string | object, ...args: unknown[]) {
    console.warn(formatter, ...args);
  }
}
