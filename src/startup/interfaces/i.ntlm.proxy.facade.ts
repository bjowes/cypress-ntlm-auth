import { NtlmConfig } from "../../models/ntlm.config.model";
import { NtlmSsoConfig } from "../../models/ntlm.sso.config.model";
import { PortsConfig } from "../../models/ports.config.model";

export interface INtlmProxyFacade {
  alive(configApiUrl?: string): Promise<PortsConfig>;
  reset(configApiUrl: string): Promise<void>;
  ntlm(configApiUrl: string, ntlmConfig: NtlmConfig): Promise<void>;
  ntlmSso(configApiUrl: string, ntlmSsoConfig: NtlmSsoConfig): Promise<void>;
  quitIfRunning(configApiUrl?: string): Promise<boolean>;
}
