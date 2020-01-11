// cSpell:ignore Legoland, Bricksburg, objsign

import http from 'http';
import https from 'https';
import express from 'express';
//import ntlm from 'express-ntlm';
const ntlm = require('@bjowes/express-ntlm');
import net from 'net';
import bodyParser from 'body-parser';
import { pki } from 'node-forge';
import { AddressInfo } from 'net';
import { networkInterfaces } from 'os';

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

  private certPem = '';
  private privateKeyPem = '';
  private publicKeyPem = '';

  private httpServer: http.Server;
  private httpsServer: https.Server;

  private httpServerSockets = new Set<net.Socket>();
  private httpsServerSockets = new Set<net.Socket>();

  private lastRequestHeaders: http.IncomingHttpHeaders;
  private sendNtlmType2Header: string = null;
  private sendWwwAuthHeader: AuthResponeHeader[] = [];

  constructor() {
    this.initExpress(this.appNoAuth, false);
    this.initExpress(this.appNtlmAuth, true);
    this.generateSelfSignedCert();
    this.httpServer = http.createServer(this.appNtlmAuth);
    this.httpsServer = https.createServer({
      key: this.privateKeyPem,
      cert: this.certPem
    }, this.appNtlmAuth);
  }

  private createResponse(res: express.Response, body: any) {
    res.setHeader('Content-Type', 'application/json');
    if (this.sendNtlmType2Header !== null) {
      res.setHeader('www-authenticate', 'NTLM ' + this.sendNtlmType2Header );
      res.sendStatus(401);
    } else if (this.sendWwwAuthHeader.length > 0) {
      const auth = this.sendWwwAuthHeader.shift();
        res.setHeader('www-authenticate', auth.header);
        res.sendStatus(auth.status);
    } else {
      res.status(200).send(JSON.stringify(body));
    }
  }

  private initExpress(app: express.Application, useNtlm: boolean) {
    app.use(bodyParser.json());

    app.use(function(err: ExpressError, req: express.Request, res: express.Response, next: express.NextFunction) {
      if (res.headersSent) {
        return next(err);
      }
      res.status(err.status || 500);
      res.render('error', {
          message: err.message,
          error: err
      });
    });

    if (useNtlm) {
      app.use(ntlm({})); // Enables NTLM without check of user/pass
    }

    app.get('/get', (req, res) => {
      this.lastRequestHeaders = req.headers;
      let body = {
        message: 'Expecting larger payload on GET',
        reply: 'OK ÅÄÖéß'
      };
      this.createResponse(res, body);
    });

    app.post('/post', (req, res) => {
      this.lastRequestHeaders = req.headers;
      if (!req.body || !('ntlmHost' in req.body)) {
        res.status(400).send('Invalid body');
      }

      req.body.reply = 'OK ÅÄÖéß';
      this.createResponse(res, req.body);
    });

    app.put('/put', (req, res) => {
      this.lastRequestHeaders = req.headers;
      if (!req.body || !('ntlmHost' in req.body)) {
        res.status(400).send('Invalid body');
      }

      req.body.reply = 'OK ÅÄÖéß';
      this.createResponse(res, req.body);
    });

    app.delete('/delete', (req, res) => {
      this.lastRequestHeaders = req.headers;
      if (!req.body || !('ntlmHost' in req.body)) {
        res.status(400).send('Invalid body');
      }

      req.body.reply = 'OK ÅÄÖéß';
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
    let sn = '';
    for (let i=0; i<4; i++) {
      sn += ('00000000' + Math.floor(Math.random()*Math.pow(256, 4)).toString(16)).slice(-8);
    }
    return sn;
  }

  private configureCert(certServer: pki.Certificate, publicKey: pki.rsa.PublicKey) {
    certServer.publicKey = publicKey;
    certServer.serialNumber = this.randomSerialNumber();
    certServer.validity.notBefore = this.yesterday();
    certServer.validity.notAfter = this.tomorrow();
    let subject = [{
      name: 'commonName',
      value: 'localhost'
    }, {
      name: 'countryName',
      value: 'SE'
    }, {
      shortName: 'ST',
      value: 'Legoland'
    }, {
      name: 'localityName',
      value: 'Bricksburg'
    }, {
      name: 'organizationName',
      value: 'TestOrg'
    }, {
      shortName: 'OU',
      value: 'TestOrg'
    }];
    certServer.setSubject(subject);
    certServer.setIssuer(subject);

    let extensions = [{
      name: 'basicConstraints',
      cA: true
    }, {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    }, {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true
    }, {
      name: 'nsCertType',
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: true,
      emailCA: true,
      objCA: true
    }, {
      name: 'subjectAltName',
      altNames: [{
        type: 2, // hostname
        value: 'localhost'
      }, {
        type: 7, // IP
        ip: '127.0.0.1'
      }]
    }, {
      name: 'subjectKeyIdentifier'
    }];
    certServer.setExtensions(extensions);
  }

  private generateSelfSignedCert() {
    let keysServer = pki.rsa.generateKeyPair(1024);
    let certServer = pki.createCertificate();
    this.configureCert(certServer, keysServer.publicKey);
    certServer.sign(keysServer.privateKey);
    this.certPem = pki.certificateToPem(certServer);
    this.privateKeyPem = pki.privateKeyToPem(keysServer.privateKey);
    this.publicKeyPem = pki.publicKeyToPem(keysServer.publicKey);
  }

  async startHttpServer(useNtlm: boolean, port?: number): Promise<string> {
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

    this.httpServer.on('connection', socket => {
      this.httpServerSockets.add(socket);
      socket.on('close', () => {
        this.httpServerSockets.delete(socket);
      });
    });
    return await new Promise<string>((resolve, reject) => {
      this.httpServer.on('listening', () => {
        let addressInfo = this.httpServer.address() as AddressInfo;
        const url = 'http://localhost:' + addressInfo.port;
        this.httpServer.removeListener('error', reject);
        resolve(url);
      });
      this.httpServer.on('error', reject);
      this.httpServer.listen(port);
    });
  }

  async stopHttpServer() {
    await new Promise((resolve, reject) => {
      this.httpServer.on('close', () => resolve()); // Called when all connections have been closed
      this.httpServer.close((err) => {
        if (err) {
          reject(err);
        }
      });
    });
  }

  destroyHttpSockets() {
    for (const socket of this.httpServerSockets.values()) {
      socket.destroy();
    }
    this.httpServerSockets = new Set();
  }

  async startHttpsServer(useNtlm: boolean, port?: number): Promise<string> {
    if (!port) {
      port = 0;
    }
    if (useNtlm) {
      this.httpsServer = https.createServer({
        key: this.privateKeyPem,
        cert: this.certPem
      }, this.appNtlmAuth);
    } else {
      this.httpsServer = https.createServer({
        key: this.privateKeyPem,
        cert: this.certPem
      }, this.appNoAuth);
    }
    // Increase TCP keep-alive timeout to 61 secs to detect issues with hanging connections
    this.httpsServer.keepAliveTimeout = 61 * 1000;
    this.httpsServer.headersTimeout = 65 * 1000;

    this.httpsServer.on('connection', socket => {
      this.httpsServerSockets.add(socket);
      socket.on('close', () => {
        this.httpsServerSockets.delete(socket);
      });
    });

    return await new Promise<string>((resolve, reject) => {
      this.httpsServer.on('listening', () => {
        let addressInfo = this.httpsServer.address() as AddressInfo;
        const url = 'https://localhost:' + addressInfo.port;
        this.httpsServer.removeListener('error', reject);
        resolve(url);
      });
      this.httpsServer.on('error', reject);
      this.httpsServer.listen(port);
    });
  }

  async stopHttpsServer() {
    await new Promise((resolve, reject) => {
      this.httpsServer.on('close', () => resolve()); // Called when all connections have been closed
      this.httpsServer.close((err) => {
        if (err) {
          reject(err);
        }
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
    return Buffer.from(this.certPem, 'utf8');
  }

  lastRequestContainedAuthHeader(): boolean {
    return this.lastRequestHeaders.authorization !== undefined &&
           this.lastRequestHeaders.authorization.length > 0;
  }

  sendNtlmType2(fakeHeader: string) {
    this.sendNtlmType2Header = fakeHeader;
  }

  sendWwwAuthOnce(fakeHeader: string) {
    this.sendWwwAuthHeader = [ { header: fakeHeader, status: 401 } ];
  }

  sendWwwAuth(fakeHeaders: AuthResponeHeader[]) {
    this.sendWwwAuthHeader = fakeHeaders;
  }

  restartNtlm() {
    this.appNtlmAuth.use(ntlm({}));
  }
}

