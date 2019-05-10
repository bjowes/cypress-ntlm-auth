export interface IConfigServer {
  configApiUrl: string;
  init(): void;
  start(port?: number): Promise<string>;
  stop(): Promise<void>;
}
