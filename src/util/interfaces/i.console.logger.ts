export abstract class IConsoleLogger {
  abstract warn(formatter: string | object, ...args: unknown[]): void;
}
