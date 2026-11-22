import type { PortsConfig } from "../../models/ports.config.model.ts";

export default abstract class ICoreServer {
  abstract start(
    httpProxy?: string,
    httpsProxy?: string,
    noProxy?: string,
    configApiPort?: number,
    ntlmProxyPort?: number
  ): Promise<PortsConfig>;
  abstract stop(): Promise<void>;
}
