import type { HttpsValidationLevelType } from "../../models/https.validation.level.ts";
import type { PortsConfig } from "../../models/ports.config.model.ts";

export abstract class IEnvironment {
  configApiUrl: string | undefined;
  configApiPort: number | undefined;
  ntlmProxyUrl: string | undefined;
  ntlmProxyPort: number | undefined;
  httpProxy: string | undefined;
  httpsProxy: string | undefined;
  noProxy: string | undefined;
  abstract httpsValidation: HttpsValidationLevelType;
  abstract configureForCypress(ports: PortsConfig): void;
  abstract delete(key: string): void;
  abstract validateEnvironmentUrls(): void;
}
