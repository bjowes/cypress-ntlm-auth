export interface INtlmProxyExit {
  quitIfRunning(configApiUrl?: string): Promise<void>;
}
