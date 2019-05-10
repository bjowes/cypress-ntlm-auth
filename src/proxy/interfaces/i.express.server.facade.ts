import { RequestHandler } from 'express';
import { PathParams } from 'express-serve-static-core';

export interface IExpressServerFacade {
  use(path: PathParams, ...handlers: RequestHandler[]): IExpressServerFacade;
  listen(port: number): Promise<string>;
  close(): Promise<void>;
}
