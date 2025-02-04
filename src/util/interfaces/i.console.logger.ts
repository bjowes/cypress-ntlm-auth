export interface IConsoleLogger {
  warn(formatter: string | object, ...args: unknown[]): void;
}
