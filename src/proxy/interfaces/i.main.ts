import { PortsConfig } from "../../models/ports.config.model";

export interface IMain {
  run(
    httpProxy?: string,
    httpsProxy?: string,
    noProxy?: string,
    configApiPort?: number,
    ntlmProxyPort?: number
  ): Promise<PortsConfig>;
  stop(): Promise<void>;
}
