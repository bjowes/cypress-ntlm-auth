import express from "express";
import http from "http";
import bodyParser from "body-parser";
import { injectable } from "inversify";
import { IExpressServerFacade } from "./interfaces/i.express.server.facade";
import { PathParams } from "express-serve-static-core";
import { AddressInfo } from "net";
import { URLExt } from "../util/url.ext";

/**
 * Express HTTP server facade, used for Config API
 */
@injectable()
export class ExpressServerFacade implements IExpressServerFacade {
  private readonly _app: express.Application = express();
  private _listener?: http.Server;

  /**
   * Constructor
   */
  constructor() {
    this._app.use(bodyParser.json());
  }

  /**
   * Apply callbacks to Express
   * @param path Path to match
   * @param handlers Handlers for the requests
   * @returns The facade for fluent calls
   */
  use(
    path: PathParams,
    ...handlers: express.RequestHandler[]
  ): IExpressServerFacade {
    this._app.use(path, handlers);
    return this;
  }

  /**
   * Starts listening to requests
   * @param port Requested port, any free port is used if not set
   * @returns The Url that the proxy listens to
   */
  listen(port: number): Promise<URL> {
    return new Promise<URL>((resolve, reject) => {
      this._listener = this._app.listen(port, "127.0.0.1");
      this._listener.on("listening", () => {
        const addressInfo = this._listener!.address() as AddressInfo;
        resolve(URLExt.addressInfoToUrl(addressInfo, "http:"));
      });
      this._listener.on("error", reject);
    });
  }

  /**
   * Stops the listener
   * @returns void
   */
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
