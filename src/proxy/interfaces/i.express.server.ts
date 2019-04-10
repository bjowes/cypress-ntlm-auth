import { RequestHandler } from 'express';
import { PathParams } from 'express-serve-static-core';

export interface IExpressServer {
  use(path: PathParams, ...handlers: RequestHandler[]): IExpressServer;
  listen(port: number): Promise<string>;
  close(): Promise<void>;
}
