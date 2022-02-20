import express from "express";
import http from "http";
import bodyParser from "body-parser";
import { injectable } from "inversify";
import { IExpressServerFacade } from "./interfaces/i.express.server.facade";
import { PathParams } from "express-serve-static-core";
import { AddressInfo } from "net";

@injectable()
export class ExpressServerFacade implements IExpressServerFacade {
  private readonly _app: express.Application = express();
  private _listener?: http.Server;

  constructor() {
    this._app.use(bodyParser.json());
  }

  use(path: PathParams, ...handlers: express.RequestHandler[]): IExpressServerFacade {
    this._app.use(path, handlers);
    return this;
  }

  listen(port: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this._listener = this._app.listen(port, "127.0.0.1");
      this._listener.on("listening", () => {
        const address = this._listener!.address() as AddressInfo;
        resolve(`http://${address.address}:${address.port}`);
      });
      this._listener.on("error", reject);
    });
  }

  close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this._listener) {
        this._listener.close((err?: Error) => {
          this._listener = undefined;
          if (err) {
            return reject(err);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
