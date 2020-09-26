export interface IExternalNtlmProxyFacade {
  isAlive(configApiUrl?: string): Promise<boolean>;
  quitIfRunning(configApiUrl?: string): Promise<void>;
}
