export interface IMain {
  run(allowMultipleInstances: boolean, httpProxy?: string, httpsProxy?: string, noProxy?: string): Promise<void>
  stop(): Promise<void>;
}
