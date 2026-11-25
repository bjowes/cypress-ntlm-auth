import type { PortsConfig } from "../../models/ports.config.model.ts";

export abstract class IMain {
  abstract run(
    httpProxy?: string,
    httpsProxy?: string,
    noProxy?: string,
    configApiPort?: number,
    ntlmProxyPort?: number
  ): Promise<PortsConfig>;
  abstract stop(): Promise<void>;
}
