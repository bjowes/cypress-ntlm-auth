export interface INtlmProxyServer {
  ntlmProxyUrl: string;
  init(): void;
  start(port?: number): Promise<string>;
  stop(): void;
}
