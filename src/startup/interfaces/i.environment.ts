import { PortsConfig } from "../../models/ports.config.model";

export interface IEnvironment {
  configApiUrl: string | undefined;
  configApiPort: number | undefined;
  ntlmProxyUrl: string | undefined;
  ntlmProxyPort: number | undefined;
  httpProxy: string | undefined;
  httpsProxy: string | undefined;
  noProxy: string | undefined;
  configureForCypress(ports: PortsConfig): void;
  delete(key: string): void;
}
