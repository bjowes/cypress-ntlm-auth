export abstract class ICypressFacade {
  abstract cypressLoaded(): boolean;
  abstract run(options: Partial<CypressCommandLine.CypressRunOptions>): Promise<CypressCommandLine.CypressRunResult | CypressCommandLine.CypressFailedRunResult>;
  abstract open(options: Partial<CypressCommandLine.CypressOpenOptions>): Promise<void>;
  abstract parseRunArguments(runArguments: string[]): Promise<Partial<CypressCommandLine.CypressRunOptions>>;
}
