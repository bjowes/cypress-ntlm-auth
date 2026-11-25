export abstract class INtlmProxyServer {
  abstract init(): void;
  abstract start(port?: number): Promise<string>;
  abstract stop(): void;
}
