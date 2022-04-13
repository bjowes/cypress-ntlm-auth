export interface IHttpMitmProxyFacade {
  use(mod: any): IHttpMitmProxyFacade;
  listen(port: number): Promise<URL>;
  close(): void;
}
