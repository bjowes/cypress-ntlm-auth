import type { HttpsValidationLevelType } from "../../models/https.validation.level.ts";
import type { PortsConfig } from "../../models/ports.config.model.ts";

export interface IEnvironment {
  configApiUrl: string | undefined;
  configApiPort: number | undefined;
  ntlmProxyUrl: string | undefined;
  ntlmProxyPort: number | undefined;
  httpProxy: string | undefined;
  httpsProxy: string | undefined;
  noProxy: string | undefined;
  httpsValidation: HttpsValidationLevelType;
  configureForCypress(ports: PortsConfig): void;
  delete(key: string): void;
  validateEnvironmentUrls(): void;
}
