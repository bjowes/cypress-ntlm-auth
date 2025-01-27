export interface ICypressFacade {
  cypressLoaded(): boolean;
  run(options: Partial<CypressCommandLine.CypressRunOptions>): Promise<CypressCommandLine.CypressRunResult | CypressCommandLine.CypressFailedRunResult>;
  open(options: Partial<CypressCommandLine.CypressOpenOptions>): Promise<void>;
  parseRunArguments(runArguments: string[]): Promise<Partial<CypressCommandLine.CypressRunOptions>>;
}
