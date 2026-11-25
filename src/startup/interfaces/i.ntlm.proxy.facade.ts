import type { NtlmConfig } from "../../models/ntlm.config.model.ts";
import type { NtlmSsoConfig } from "../../models/ntlm.sso.config.model.ts";
import type { PortsConfig } from "../../models/ports.config.model.ts";

export abstract class INtlmProxyFacade {
  abstract alive(configApiUrl?: string): Promise<PortsConfig>;
  abstract reset(configApiUrl: string): Promise<void>;
  abstract ntlm(configApiUrl: string, ntlmConfig: NtlmConfig): Promise<void>;
  abstract ntlmSso(configApiUrl: string, ntlmSsoConfig: NtlmSsoConfig): Promise<void>;
  abstract quitIfRunning(configApiUrl?: string): Promise<boolean>;
}
