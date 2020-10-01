export interface IConfigServer {
  init(): void;
  start(port?: number): Promise<string>;
  stop(): Promise<void>;
}
