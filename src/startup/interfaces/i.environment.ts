import { PortsConfig } from "../../models/ports.config.model";
import { HttpsValidationLevel } from "../../proxy/https.validation";

export interface IEnvironment {
  configApiUrl: string | undefined;
  configApiPort: number | undefined;
  ntlmProxyUrl: string | undefined;
  ntlmProxyPort: number | undefined;
  httpProxy: string | undefined;
  httpsProxy: string | undefined;
  noProxy: string | undefined;
  httpsValidation: HttpsValidationLevel;
  configureForCypress(ports: PortsConfig): void;
  delete(key: string): void;
}
