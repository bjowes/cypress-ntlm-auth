export abstract class IUpstreamProxyConfigurator {
  abstract removeUnusedProxyEnv(): void;
  abstract processNoProxyLoopback(): void;
}
