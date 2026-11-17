import type { NtlmConfig } from "../../models/ntlm.config.model.ts";
import type { NtlmSsoConfig } from "../../models/ntlm.sso.config.model.ts";
import type { PortsConfig } from "../../models/ports.config.model.ts";

export interface INtlmProxyFacade {
  alive(configApiUrl?: string): Promise<PortsConfig>;
  reset(configApiUrl: string): Promise<void>;
  ntlm(configApiUrl: string, ntlmConfig: NtlmConfig): Promise<void>;
  ntlmSso(configApiUrl: string, ntlmSsoConfig: NtlmSsoConfig): Promise<void>;
  quitIfRunning(configApiUrl?: string): Promise<boolean>;
}
