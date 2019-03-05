// cSpell:ignore Legoland, Bricksburg, objsign

const http = require('http');
const https = require('https');
const express = require('express');
const ntlm = require('express-ntlm');
const bodyParser = require('body-parser');
const pki = require('node-forge').pki;

const appNoAuth = express();
const appNtlmAuth = express();

function initExpress(app, useNtlm) {
  app.use(bodyParser.json());

  app.use(function(err, req, res, next) {
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

initExpress(appNoAuth, false);
initExpress(appNtlmAuth, true);

function yesterday() {
  let d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

function tomorrow() {
  let d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

function randomSerialNumber() {
	// generate random 16 bytes hex string
	var sn = '';
	for (var i=0; i<4; i++) {
		sn += ('00000000' + Math.floor(Math.random()*Math.pow(256, 4)).toString(16)).slice(-8);
	}
	return sn;
}

function configureCert(certServer, publicKey) {
  certServer.publicKey = publicKey;
  certServer.serialNumber = randomSerialNumber();
  certServer.validity.notBefore = yesterday();
  certServer.validity.notAfter = tomorrow();
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

let certPem;
let privateKeyPem;
let publicKeyPem;

function generateSelfSignedCert(callback) {
  if (certPem && privateKeyPem && publicKeyPem) {
    return callback(certPem, privateKeyPem, publicKeyPem);
  }

  var keysServer = pki.rsa.generateKeyPair(1024);
  var certServer = pki.createCertificate();
  configureCert(certServer, keysServer.publicKey);
  certServer.sign(keysServer.privateKey);
  certPem = pki.certificateToPem(certServer);
  privateKeyPem = pki.privateKeyToPem(keysServer.privateKey);
  publicKeyPem = pki.publicKeyToPem(keysServer.publicKey);
  return callback(certPem, privateKeyPem, publicKeyPem);
}

let httpServer;
let httpsServer;

module.exports = {
  startHttpServer: function(useNtlm, port, callback) {
    if (!port) {
      port = 0;
    }
    if (useNtlm) {
      httpServer = http.createServer(appNtlmAuth);
    } else {
      httpServer = http.createServer(appNoAuth);
    }
    httpServer.listen(port, '127.0.0.1', 511, (err) => {
      if (err) {
        throw err;
      }
      let url = 'http://localhost:' + httpServer.address().port;
      callback(url);
    });
  },
  stopHttpServer: function(callback) {
    httpServer.on('close', callback); // Called when all connections have been closed
    httpServer.close((err) => {
      if (err) {
        throw err;
      }
    });
  },
  startHttpsServer: function(useNtlm, port, callback) {
    if (!port) {
      port = 0;
    }
    generateSelfSignedCert((certPem, privateKeyPem /*, publicKeyPem */) => {
      if (useNtlm) {
        httpsServer = https.createServer({
          key: privateKeyPem,
          cert: certPem
        }, appNtlmAuth);
      } else {
        httpsServer = https.createServer({
          key: privateKeyPem,
          cert: certPem
        }, appNoAuth);
      }
      httpsServer.listen(port, '127.0.0.1', 511, (err) => {
        if (err) {
          throw err;
        }
        let url = 'https://localhost:' + httpsServer.address().port;
        callback(url);
      });
    });
  },
  stopHttpsServer: function(callback) {
    httpsServer.on('close', callback); // Called when all connections have been closed
    httpsServer.close((err) => {
      if (err) {
        throw err;
      }
    });
  },
};
