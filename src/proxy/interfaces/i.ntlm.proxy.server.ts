export interface INtlmProxyServer {
  init(): void;
  start(port?: number): Promise<string>;
  stop(): void;
}
