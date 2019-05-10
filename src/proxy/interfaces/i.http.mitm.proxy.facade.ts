export interface IHttpMitmProxyFacade {
  use(mod: any): IHttpMitmProxyFacade;
  listen(port: number): Promise<string>;
  close(): void;
}
