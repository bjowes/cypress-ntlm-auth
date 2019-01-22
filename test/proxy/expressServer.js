const http = require('http');
const https = require('https');
const express = require('express');
const ntlm = require('express-ntlm');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const appNoAuth = express();
const appNtlmAuth = express();

function initExpress(app, useNtlm) {
  app.use(bodyParser.json());

  app.use(function(err, req, res, next) {
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

let httpServer;
let httpsServer;

module.exports = {
  startHttpServer: function(useNtlm, callback) {
    if (useNtlm) {
      httpServer = http.createServer(appNtlmAuth);
    } else {
      httpServer = http.createServer(appNoAuth);
    }
    httpServer.listen(0, '127.0.0.1', 511, (err) => {
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
  startHttpsServer: function(useNtlm, callback) {
    let httpMitmProxyDir = path.resolve(process.cwd(), '.http-mitm-proxy');
    if (useNtlm) {
      httpsServer = https.createServer({
        key: fs.readFileSync(path.resolve(httpMitmProxyDir, 'keys/localhost.key')),
        cert: fs.readFileSync(path.resolve(httpMitmProxyDir, 'certs/localhost.pem')),
        ca: fs.readFileSync(path.resolve(httpMitmProxyDir, 'certs/ca.pem'))
      }, appNtlmAuth);
    } else {
      httpsServer = https.createServer({
        key: fs.readFileSync(path.resolve(httpMitmProxyDir, 'keys/localhost.key')),
        cert: fs.readFileSync(path.resolve(httpMitmProxyDir, 'certs/localhost.pem')),
        ca: fs.readFileSync(path.resolve(httpMitmProxyDir, 'certs/ca.pem'))
      }, appNoAuth);
    }
    httpsServer.listen(0, '127.0.0.1', 511, (err) => {
      if (err) {
        throw err;
      }
      let url = 'https://localhost:' + httpsServer.address().port;
      callback(url);
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
