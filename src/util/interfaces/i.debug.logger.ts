export interface IDebugLogger {
  log(formatter: string | object | undefined, ...args: unknown[]): void;
}
