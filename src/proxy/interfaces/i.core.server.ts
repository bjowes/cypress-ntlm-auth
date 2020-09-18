import { PortsConfig } from "../../models/ports.config.model";

export interface ICoreServer {
  start(
    httpProxy?: string,
    httpsProxy?: string,
    noProxy?: string
  ): Promise<PortsConfig>;
  stop(): Promise<void>;
}
