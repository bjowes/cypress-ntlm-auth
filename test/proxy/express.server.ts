// cSpell:ignore Legoland, Bricksburg, objsign

import http from 'http';
import https from 'https';
import express from 'express';
import ntlm from 'express-ntlm';
import bodyParser from 'body-parser';
import { pki } from 'node-forge';
import { AddressInfo } from 'net';

interface ExpressError extends Error {
  status?: number
}

export class ExpressServer {
  private appNoAuth = express();
  private appNtlmAuth = express();

  private certPem = '';
  private privateKeyPem = '';
  private publicKeyPem = '';

  private httpServer: http.Server;
  private httpsServer: https.Server;

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
      let body = {
        message: 'Expecting larger payload on GET',
        reply: 'OK ÅÄÖéß'
      };
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(JSON.stringify(body));
    });

    app.post('/post', (req, res) => {
      if (!req.body || !('ntlmHost' in req.body)) {
        res.status(400).send('Invalid body');
      }

      req.body.reply = 'OK ÅÄÖéß';
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(JSON.stringify(req.body));
    });

    app.put('/put', (req, res) => {
      if (!req.body || !('ntlmHost' in req.body)) {
        res.status(400).send('Invalid body');
      }

      req.body.reply = 'OK ÅÄÖéß';
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(req.body);
    });

    app.delete('/delete', (req, res) => {
      if (!req.body || !('ntlmHost' in req.body)) {
        res.status(400).send('Invalid body');
      }

      req.body.reply = 'OK ÅÄÖéß';
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(req.body);
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
    var sn = '';
    for (var i=0; i<4; i++) {
      sn += ('00000000' + Math.floor(Math.random()*Math.pow(256, 4)).toString(16)).slice(-8);
    }
    return sn;
  }

  private configureCert(certServer: pki.Certificate, publicKey: pki.rsa.PublicKey) {
    certServer.publicKey = publicKey;
    certServer.serialNumber = this.randomSerialNumber();
    certServer.validity.notBefore = this.yesterday();
    certServer.validity.notAfter = this.tomorrow();
    var subject = [{
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
    var keysServer = pki.rsa.generateKeyPair(1024);
    var certServer = pki.createCertificate();
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
    return await new Promise<string>((resolve, reject) => {
      this.httpServer.listen(port, '127.0.0.1', 511, (err: Error) => {
        if (err) {
          reject(err);
        }
        let addressInfo = this.httpServer.address() as AddressInfo;
        let url = 'http://localhost:' + addressInfo.port;
        resolve(url);
      });
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
    return await new Promise<string>((resolve, reject) => {
      this.httpsServer.listen(port, '127.0.0.1', 511, (err: Error) => {
        if (err) {
          reject(err);
        }
        let addressInfo = this.httpsServer.address() as AddressInfo;
        let url = 'https://localhost:' + addressInfo.port;
        resolve(url);
      });
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

  public get caCert(): Buffer {
    return Buffer.from(this.certPem, 'utf8');
  }
}
