import { NtlmConfig } from "../../models/ntlm.config.model.js";
import { NtlmSsoConfig } from "../../models/ntlm.sso.config.model.js";

export interface INtlmProxyFacade {
  alive(configApiUrl?: string): Promise<any>;
  reset(configApiUrl: string): Promise<any>;
  ntlm(configApiUrl: string, ntlmConfig: NtlmConfig): Promise<any>;
  ntlmSso(configApiUrl: string, ntlmSsoConfig: NtlmSsoConfig): Promise<any>;
  quitIfRunning(configApiUrl?: string): Promise<boolean>;
}
