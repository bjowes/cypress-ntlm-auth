import { PortsConfig } from "../../models/ports.config.model";

export interface IStartup {
  argumentsToCypressMode(args: string[]): string | undefined;
  prepareOptions(args: string[]): Promise<any>;
  run(options: any): Promise<any>;
  open(options: any): Promise<any>;
  startNtlmProxy(): Promise<PortsConfig>;
}
