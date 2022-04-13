import { injectable } from "inversify";
import { IConsoleLogger } from "./interfaces/i.console.logger";

@injectable()
export class ConsoleLogger implements IConsoleLogger {
  warn(formatter: any, ...args: any[]) {
    console.warn(formatter, ...args);
  }
}
