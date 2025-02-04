export interface IHttpMitmProxyFacade {
  use(mod: object): IHttpMitmProxyFacade;
  listen(port: number): Promise<URL>;
  close(): void;
}
