// cSpell:ignore Legoland, Bricksburg, objsign

import * as http from "http";
import * as https from "https";
import express from "express";
import ntlm from "express-ntlm";
import * as net from "net";
import bodyParser from "body-parser";
import forge from "node-forge";
import { AddressInfo } from "net";
import * as stream from "stream";

import debugInit from "debug";
import { URLExt } from "../../../src/util/url.ext";
const debug = debugInit("cypress:plugin:ntlm-auth:express-ntlm");

interface ExpressError extends Error {
  status?: number;
}

export interface AuthResponeHeader {
  header: string;
  status: number;
}

export class ExpressServer {
  private appNoAuth = express();
  private appNtlmAuth = express();

  private certPem = "";
  private privateKeyPem = "";
  private publicKeyPem = "";

  private httpServer: http.Server;
  private httpsServer: https.Server;

  private httpServerSockets = new Set<net.Socket>();
  private httpsServerSockets = new Set<stream.Duplex>();

  private lastRequestHeaders: http.IncomingHttpHeaders | null = null;
  private sendNtlmType2Header: string | null = null;
  private sendWwwAuthHeader: AuthResponeHeader[] = [];
  private closeConnectionOnNextRequestState = false;

  private customStatusPhrase: string | null = null;

  private connectCount = 0;

  constructor() {
    this.initExpress(this.appNoAuth, false);
    this.initExpress(this.appNtlmAuth, true);
    this.generateSelfSignedCert();
    this.httpServer = http.createServer(this.appNtlmAuth);
    this.httpsServer = https.createServer(
      {
        key: this.privateKeyPem,
        cert: this.certPem,
      },
      this.appNtlmAuth
    );
  }

  private overrideNtlm(res: express.Response): boolean {
    if (this.closeConnectionOnNextRequestState) {
      debug("closeConnectionOnNextRequestState - closing!");
      this.closeConnectionOnNextRequestState = false;
      res.socket?.destroy();
      return true;
    }
    if (this.sendNtlmType2Header !== null) {
      debug("sendNtlmType2Header - sending header!");
      res.setHeader("www-authenticate", "NTLM " + this.sendNtlmType2Header);
      res.sendStatus(401);
      return true;
    }
    if (this.sendWwwAuthHeader.length > 0) {
      const auth = this.sendWwwAuthHeader.shift();
      if (auth!.header !== "PASS-ON") {
        debug("sendWwwAuthHeader - sending header!");
        res.setHeader("www-authenticate", auth!.header);
        res.sendStatus(auth!.status);
        return true;
      }
    }
    return false;
  }

  private createResponse(res: express.Response, body: any) {
    if (this.customStatusPhrase) {
      res.statusMessage = this.customStatusPhrase;
      this.customStatusPhrase = null;
    }
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(body));
  }

  private initExpress(app: express.Application, useNtlm: boolean) {
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
        if (!this.overrideNtlm(res)) {
          return next();
        }
      }
    );

    if (useNtlm) {
      app.use(
        ntlm({
          // Enables NTLM without check of user/pass
          debug: function () {
            const args = Array.prototype.slice.apply(arguments);
            debug.apply(
              null,
              args.slice(1) as [formatter: any, ...args: any[]]
            );
          },
        })
      );
    }

    app.get("/get", (req, res) => {
      let body = {
        message: "Expecting larger payload on GET",
        reply: "OK ÅÄÖéß",
      };
      this.createResponse(res, body);
    });

    app.post("/post", (req, res) => {
      if (!req.body || !("ntlmHost" in req.body)) {
        return res.status(400).send("Invalid body");
      }

      req.body.reply = "OK ÅÄÖéß";
      this.createResponse(res, req.body);
    });

    app.put("/put", (req, res) => {
      if (!req.body || !("ntlmHost" in req.body)) {
        return res.status(400).send("Invalid body");
      }

      req.body.reply = "OK ÅÄÖéß";
      this.createResponse(res, req.body);
    });

    app.delete("/delete", (req, res) => {
      if (!req.body || !("ntlmHost" in req.body)) {
        return res.status(400).send("Invalid body");
      }

      req.body.reply = "OK ÅÄÖéß";
      this.createResponse(res, req.body);
    });
  }

  private yesterday(): Date {
    let d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }

  private tomorrow(): Date {
    let d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }

  private randomSerialNumber(): string {
    // generate random 16 bytes hex string
    let sn = "";
    for (let i = 0; i < 4; i++) {
      sn += (
        "00000000" + Math.floor(Math.random() * Math.pow(256, 4)).toString(16)
      ).slice(-8);
    }
    return sn;
  }

  private configureCert(
    certServer: forge.pki.Certificate,
    publicKey: forge.pki.rsa.PublicKey
  ) {
    certServer.publicKey = publicKey;
    certServer.serialNumber = this.randomSerialNumber();
    certServer.validity.notBefore = this.yesterday();
    certServer.validity.notAfter = this.tomorrow();
    let subject = [
      {
        name: "commonName",
        value: "localhost",
      },
      {
        name: "countryName",
        value: "SE",
      },
      {
        shortName: "ST",
        value: "Legoland",
      },
      {
        name: "localityName",
        value: "Bricksburg",
      },
      {
        name: "organizationName",
        value: "TestOrg",
      },
      {
        shortName: "OU",
        value: "TestOrg",
      },
    ];
    certServer.setSubject(subject);
    certServer.setIssuer(subject);

    let extensions = [
      {
        name: "basicConstraints",
        cA: true,
      },
      {
        name: "keyUsage",
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
      },
      {
        name: "extKeyUsage",
        serverAuth: true,
        clientAuth: true,
        codeSigning: true,
        emailProtection: true,
        timeStamping: true,
      },
      {
        name: "nsCertType",
        client: true,
        server: true,
        email: true,
        objsign: true,
        sslCA: true,
        emailCA: true,
        objCA: true,
      },
      {
        name: "subjectAltName",
        altNames: [
          {
            type: 2, // hostname
            value: "localhost",
          },
          {
            type: 2, // hostname
            value: "[::1]",
          },
          {
            type: 7, // IP
            ip: "127.0.0.1",
          },
        ],
      },
      {
        name: "subjectKeyIdentifier",
      },
    ];
    certServer.setExtensions(extensions);
  }

  private generateSelfSignedCert() {
    let keysServer = forge.pki.rsa.generateKeyPair(1024);
    let certServer = forge.pki.createCertificate();
    this.configureCert(certServer, keysServer.publicKey);
    certServer.sign(keysServer.privateKey);
    this.certPem = forge.pki.certificateToPem(certServer);
    this.privateKeyPem = forge.pki.privateKeyToPem(keysServer.privateKey);
    this.publicKeyPem = forge.pki.publicKeyToPem(keysServer.publicKey);
  }

  async startHttpServer(useNtlm: boolean, port?: number): Promise<URL> {
    if (!port) {
      port = 0;
    }
    if (useNtlm) {
      this.httpServer = http.createServer(this.appNtlmAuth);
    } else {
      this.httpServer = http.createServer(this.appNoAuth);
    }
    // Increase TCP keep-alive timeout to 61 secs to detect issues with hanging connections
    this.httpsServer.keepAliveTimeout = 61 * 1000;
    this.httpsServer.headersTimeout = 65 * 1000;

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

  async startHttpsServer(useNtlm: boolean, port?: number): Promise<URL> {
    if (!port) {
      port = 0;
    }
    if (useNtlm) {
      this.httpsServer = https.createServer(
        {
          key: this.privateKeyPem,
          cert: this.certPem,
        },
        this.appNtlmAuth
      );
    } else {
      this.httpsServer = https.createServer(
        {
          key: this.privateKeyPem,
          cert: this.certPem,
        },
        this.appNoAuth
      );
    }
    // Increase TCP keep-alive timeout to 61 secs to detect issues with hanging connections
    this.httpsServer.keepAliveTimeout = 61 * 1000;
    this.httpsServer.headersTimeout = 65 * 1000;

    this.httpsServer.on("connection", (socket) => {
      this.httpsServerSockets.add(socket);
      this.connectCount++;
      socket.on("close", () => {
        this.httpsServerSockets.delete(socket);
      });
    });

    return await new Promise<URL>((resolve, reject) => {
      this.httpsServer.on("listening", () => {
        const addressInfo = this.httpsServer.address() as AddressInfo;
        const url = URLExt.addressInfoToUrl(addressInfo, "https:");
        debug("https webserver listening: ", url.origin);
        this.httpsServer.removeListener("error", reject);
        resolve(url);
      });
      this.httpsServer.on("error", reject);
      this.httpsServer.listen(port, "localhost");
    });
  }

  async stopHttpsServer() {
    await new Promise<void>((resolve, reject) => {
      this.httpsServer.close((err) => {
        if (err) {
          debug("https webserver closed with error: ", err);
          return reject(err);
        }
        debug("https webserver closed");
        resolve();
      });
    });
  }

  destroyHttpsSockets() {
    for (const socket of this.httpsServerSockets.values()) {
      socket.destroy();
    }
    this.httpsServerSockets = new Set();
  }

  get caCert(): Buffer {
    return Buffer.from(this.certPem, "utf8");
  }

  lastRequestContainedAuthHeader(): boolean {
    return (
      this.lastRequestHeaders != null &&
      this.lastRequestHeaders.authorization !== undefined &&
      this.lastRequestHeaders.authorization.length > 0
    );
  }

  sendNtlmType2(fakeHeader: string | null) {
    this.sendNtlmType2Header = fakeHeader;
  }

  sendWwwAuthOnce(fakeHeader: string) {
    this.sendWwwAuthHeader = [{ header: fakeHeader, status: 401 }];
  }

  sendWwwAuth(fakeHeaders: AuthResponeHeader[]) {
    this.sendWwwAuthHeader = fakeHeaders;
  }

  closeConnectionOnNextRequest(close: boolean) {
    this.closeConnectionOnNextRequestState = close;
  }

  restartNtlm() {
    this.appNtlmAuth.use(ntlm({}));
  }

  setCustomStatusPhrase(phrase: string) {
    this.customStatusPhrase = phrase;
  }

  getConnectCount() {
    return this.connectCount;
  }

  resetConnectCount() {
    this.connectCount = 0;
  }
}
