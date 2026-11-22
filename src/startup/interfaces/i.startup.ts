import type { PortsConfig } from "../../models/ports.config.model.ts";
import type { CypressFailedRunResult, CypressOpenOptions, CypressRunOptions, CypressRunResult } from "./i.cypress.facade.ts";

export default abstract class IStartup {
  abstract argumentsToCypressMode(args: string[]): string | undefined;
  abstract prepareOptions(args: string[]): Promise<Partial<CypressRunOptions>>;
  abstract run(options: Partial<CypressRunOptions>): Promise<CypressRunResult | CypressFailedRunResult>;
  abstract open(options: Partial<CypressOpenOptions>): Promise<void>;
  abstract startNtlmProxy(): Promise<PortsConfig>;
}
