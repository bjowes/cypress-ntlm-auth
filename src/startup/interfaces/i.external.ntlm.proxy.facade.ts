export interface IExternalNtlmProxyFacade {
  alive(configApiUrl?: string): Promise<any>;
  quitIfRunning(configApiUrl?: string): Promise<void>;
}
