import type { RequestHandler } from "express";
import type { PathParams } from "express-serve-static-core";

export interface IExpressServerFacade {
  use(path: PathParams, ...handlers: RequestHandler[]): IExpressServerFacade;
  listen(port: number): Promise<URL>;
  close(): Promise<void>;
}
