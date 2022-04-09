import { RequestHandler } from "express";
import { PathParams } from "express-serve-static-core";

export interface IExpressServerFacade {
  use(path: PathParams, ...handlers: RequestHandler[]): IExpressServerFacade;
  listen(port: number): Promise<URL>;
  close(): Promise<void>;
}
