export interface IUpstreamProxyConfigurator {
  removeUnusedProxyEnv(): void;
  processNoProxyLoopback(): void;
}
