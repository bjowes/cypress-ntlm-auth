import { PortsConfig } from "../../models/ports.config.model";

export interface IStartup {
  argumentsToCypressMode(args: string[]): string | undefined;
  prepareOptions(args: string[]): Promise<Partial<CypressCommandLine.CypressRunOptions>>;
  run(options: Partial<CypressCommandLine.CypressRunOptions>): Promise<CypressCommandLine.CypressRunResult | CypressCommandLine.CypressFailedRunResult>;
  open(options: Partial<CypressCommandLine.CypressOpenOptions>): Promise<void>;
  startNtlmProxy(): Promise<PortsConfig>;
}
