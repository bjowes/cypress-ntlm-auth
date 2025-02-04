import { PortsConfig } from "../../models/ports.config.model";
import { CypressFailedRunResult, CypressOpenOptions, CypressRunOptions, CypressRunResult } from "./i.cypress.facade";

export interface IStartup {
  argumentsToCypressMode(args: string[]): string | undefined;
  prepareOptions(args: string[]): Promise<Partial<CypressRunOptions>>;
  run(options: Partial<CypressRunOptions>): Promise<CypressRunResult | CypressFailedRunResult>;
  open(options: Partial<CypressOpenOptions>): Promise<void>;
  startNtlmProxy(): Promise<PortsConfig>;
}
