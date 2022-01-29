import { PortsConfig } from "../../models/ports.config.model.js";

export interface ICoreServer {
  start(
    httpProxy?: string,
    httpsProxy?: string,
    noProxy?: string,
    configApiPort?: number,
    ntlmProxyPort?: number
  ): Promise<PortsConfig>;
  stop(): Promise<void>;
}
