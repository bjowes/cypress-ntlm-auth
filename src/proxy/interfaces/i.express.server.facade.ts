import type { RequestHandler } from "express";
import type { PathParams } from "express-serve-static-core";

export default abstract class IExpressServerFacade {
  abstract use(path: PathParams, ...handlers: RequestHandler[]): IExpressServerFacade;
  abstract listen(port: number): Promise<URL>;
  abstract close(): Promise<void>;
}
