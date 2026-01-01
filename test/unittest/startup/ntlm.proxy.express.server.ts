import * as http from "http";
import express from "express";
import * as net from "net";
import bodyParser from "body-parser";
import { AddressInfo } from "net";

import debugInit from "debug";
import { URLExt } from "../../../src/util/url.ext";
import { PortsConfig } from "../../../src/models/ports.config.model";
const debug = debugInit("cypress:plugin:ntlm-auth:express-ntlm");

interface ExpressError extends Error {
  status?: number;
}

export interface AuthResponeHeader {
  header?: string;
  status: number;
}

export class NtlmProxyExpressServer {
  private appNoAuth = express();

  private httpServer: http.Server;

  private httpServerSockets = new Set<net.Socket>();

  private lastRequestHeaders: http.IncomingHttpHeaders | null = null;
  private closeConnectionOnNextRequestState = false;
  private customStatusCode: number = 0;

  private connectCount = 0;

  constructor() {
    this.initExpress(this.appNoAuth);
    this.httpServer = http.createServer(this.appNoAuth);
  }

  private createResponse(res: express.Response, body: any) {
    if (this.customStatusCode != 0) {
      res.status(this.customStatusCode).end();
      return;
    }

    if (body) {
      res.setHeader("Content-Type", "application/json");
      res.status(200).send(JSON.stringify(body));
    } else {
      res.status(200).end();
    }
  }

  private initExpress(app: express.Application) {
    app.use(bodyParser.json());

    app.use(function (
      err: ExpressError,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) {
      if (res.headersSent) {
        return next(err);
      }
      res.status(err.status || 500);
      res.render("error", {
        message: err.message,
        error: err,
      });
    });

    app.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        this.lastRequestHeaders = req.headers;
        if (this.closeConnectionOnNextRequestState) {
          debug("closeConnectionOnNextRequestState - closing!");
          this.closeConnectionOnNextRequestState = false;
          res.socket?.destroy();
        } else {
          next();
        }
      }
    );

    app.post("/reset", (req, res) => {
      this.createResponse(res, undefined);
    });

    app.get("/alive", (req, res) => {
      this.createResponse(res, { configApiUrl: "test", ntlmProxyUrl: "testP" } as PortsConfig);
    });

    app.post("/ntlm-config", (req, res) => {
      let resBody = req.body;
      resBody.your = 'test2';
      this.createResponse(res, resBody);
    });
  }

  async startHttpServer(port?: number): Promise<URL> {
    if (!port) {
      port = 0;
    }

    this.httpServer = http.createServer(this.appNoAuth);

    // Increase TCP keep-alive timeout to 61 secs to detect issues with hanging connections
    this.httpServer.keepAliveTimeout = 61 * 1000;
    this.httpServer.headersTimeout = 65 * 1000;

    this.httpServer.on("connection", (socket) => {
      this.httpServerSockets.add(socket);
      socket.on("close", () => {
        this.httpServerSockets.delete(socket);
      });
    });
    return await new Promise<URL>((resolve, reject) => {
      this.httpServer.on("listening", () => {
        const addressInfo = this.httpServer.address() as AddressInfo;
        const url = URLExt.addressInfoToUrl(addressInfo, "http:");
        debug("http webserver listening: ", url.origin);
        this.httpServer.removeListener("error", reject);
        resolve(url);
      });
      this.httpServer.on("error", reject);
      this.httpServer.listen(port, "localhost");
    });
  }

  async stopHttpServer() {
    await new Promise<void>((resolve, reject) => {
      this.httpServer.close((err) => {
        if (err) {
          debug("http webserver closed with error: ", err);
          return reject(err);
        }
        debug("http webserver closed");
        resolve();
      });
    });
  }

  destroyHttpSockets() {
    for (const socket of this.httpServerSockets.values()) {
      socket.destroy();
    }
    this.httpServerSockets = new Set();
  }

  lastRequestContainedHeader(header: string, content: string): boolean {
    return (
      this.lastRequestHeaders != null &&
      this.lastRequestHeaders[header] !== undefined &&
      this.lastRequestHeaders[header] === content
    );
  }

  setCustomStatusCode(statusCode: number) {
    this.customStatusCode = statusCode;
  }

  closeConnectionOnNextRequest(close: boolean) {
    this.closeConnectionOnNextRequestState = close;
  }

  getConnectCount() {
    return this.connectCount;
  }

  resetConnectCount() {
    this.connectCount = 0;
  }
}
