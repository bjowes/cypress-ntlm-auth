export default abstract class IUpstreamProxyConfigurator {
  abstract removeUnusedProxyEnv(): void;
  abstract processNoProxyLoopback(): void;
}
