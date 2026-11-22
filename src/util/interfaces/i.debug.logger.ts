export default abstract class IDebugLogger {
  abstract log(formatter: string | object | undefined, ...args: unknown[]): void;
}
