import type { PortsConfig } from "../../models/ports.config.model.ts";

export abstract class IStartup {
  abstract argumentsToCypressMode(args: string[]): string | undefined;
  abstract prepareOptions(args: string[]): Promise<Partial<CypressCommandLine.CypressRunOptions>>;
  abstract run(options: Partial<CypressCommandLine.CypressRunOptions>): Promise<CypressCommandLine.CypressRunResult | CypressCommandLine.CypressFailedRunResult>;
  abstract open(options: Partial<CypressCommandLine.CypressOpenOptions>): Promise<void>;
  abstract startNtlmProxy(): Promise<PortsConfig>;
}
