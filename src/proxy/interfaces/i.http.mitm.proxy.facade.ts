export default abstract class IHttpMitmProxyFacade {
  abstract use(mod: object): IHttpMitmProxyFacade;
  abstract listen(port: number): Promise<URL>;
  abstract close(): void;
}
