export abstract class IConfigServer {
  abstract init(): void;
  abstract start(port?: number): Promise<string>;
  abstract stop(): Promise<void>;
}
