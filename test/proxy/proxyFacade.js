const url = require('url');
const http = require('http');
const https = require('https');
const httpMitmProxy = require('http-mitm-proxy');
const getPort = require('get-port');

// The MITM proxy takes a significant time to start the first time
// due to cert generation, so we ensure this is done before the
// tests are executed to avoid timeouts
let _mitmProxyInit = false;

module.exports = {
  startMitmProxy: function(rejectUnauthorized, callback) {
    let mitmOptions = {
      host: 'localhost',
      port: null,
      keepAlive: true,
      silent: true,
      forceSNI: false,
      httpAgent: new http.Agent({
        keepAlive: true,
        rejectUnauthorized: rejectUnauthorized
      }),
      httpsAgent: new https.Agent({
        keepAlive: true,
        rejectUnauthorized: rejectUnauthorized
      }),
    };

    const mitmProxy = httpMitmProxy();
    getPort().then((port) => {
      mitmOptions.port = port;

      // Prevents exceptions from client connection termination
      mitmProxy.onConnect(function (req, socket, head, callback) {
        socket.on('error', function(err) {
          if (err.errno === 'ECONNRESET') {
            // debug('socket used by CONNECT was reset by client.');
          } else {
            throw new Error('socket used by CONNECT had an unexpected error', err);
          }
        });
        return callback();
      });

      mitmProxy.listen(mitmOptions, (err) => {
        if (err) {
          return callback(null, null, err);
        }
        return callback(mitmProxy, 'http://localhost:' + port, null);
      });
    });
  },

  stopMitmProxy: function(mitmProxy, callback) {
    mitmProxy.close();
    return callback();
  },

  initMitmProxy: function(callback) {
    if (_mitmProxyInit) {
      return callback();
    }

    module.exports.startMitmProxy(false, (mitmProxy, proxyUrl, err) => {
      if (err) {
        return callback(err);
      }
      module.exports.stopMitmProxy(mitmProxy, () => {
        _mitmProxyInit = true;
        return callback();
      });
    });
  },

  sendQuitCommand: function(configApiUrl, keepPortsFile, callback) {
    const configApi = url.parse(configApiUrl);
    const quitBody = JSON.stringify({ keepPortsFile: keepPortsFile });
    const quitReq = http.request({
      method: 'POST',
      path: '/quit',
      host: configApi.hostname,
      port: configApi.port,
      timeout: 15000,
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'content-length': Buffer.byteLength(quitBody),
      },
    }, function (res) {
      res.resume();
      if (res.statusCode !== 200) {
        return callback(new Error(
          'Unexpected response from NTLM proxy: ' + res.statusCode));
      }
      return callback();
    });
    quitReq.on('error', (err) => {
      return callback(err);
    });
    quitReq.write(quitBody);
    quitReq.end();
  },

  sendNtlmConfig: function(configApiUrl, hostConfig, callback) {
    const configUrl = url.parse(configApiUrl);
    const hostConfigJson = JSON.stringify(hostConfig);
    const configReq = http.request({
      method: 'POST',
      path: '/ntlm-config',
      host: configUrl.hostname,
      port: configUrl.port,
      timeout: 15000,
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'content-length': Buffer.byteLength(hostConfigJson),
      },
    }, (res) => {
      let responseBody;
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        if (!responseBody) {
          responseBody = chunk;
        } else {
          responseBody += chunk;
        }
      });
      res.on('end', function() {
        res.body = responseBody;
        return callback(res, null);
      });
    });
    configReq.on('error', (err) => {
      return callback(null, err);
    });
    configReq.write(hostConfigJson);
    configReq.end();
  },

  sendNtlmReset: function(configApiUrl, callback) {
    const configUrl = url.parse(configApiUrl);
    const configReq = http.request({
      method: 'POST',
      path: '/reset',
      host: configUrl.hostname,
      port: configUrl.port,
      timeout: 15000,
    }, (res) => {
      if (res.statusCode !== 200) {
        return callback(new Error('Unexpected response status code on reset', res.statusCode));
      } else {
        return callback();
      }
    });
    configReq.on('error', (err) => {
      return callback(null, err);
    });
    configReq.end();
  },

  sendRemoteRequest: function(
    ntlmProxyUrl, remoteHostWithPort, method, path, body, callback) {
    const proxyUrl = url.parse(ntlmProxyUrl);
    const remoteHostUrl = url.parse(remoteHostWithPort);
    let headers = {};
    let bodyJson;
    if (body) {
      bodyJson = JSON.stringify(body);
      headers['content-type'] = 'application/json; charset=UTF-8';
      headers['content-length'] = Buffer.byteLength(bodyJson);
    }

    if (remoteHostUrl.protocol === 'http:') {
      sendProxiedHttpRequest(method, remoteHostUrl, path,
        proxyUrl, headers, bodyJson, callback);
    } else {
      sendProxiedHttpsRequest(method, remoteHostUrl, path,
        proxyUrl, headers, bodyJson, callback);
    }
  }

};

function sendProxiedHttpRequest(
  method, remoteHostUrl, path, proxyUrl, headers, bodyJson, callback) {
  headers['Host'] = remoteHostUrl.host;

  const proxyReq = http.request({
    method: method,
    path: path,
    host: proxyUrl.hostname,
    port: proxyUrl.port,
    timeout: 3000,
    headers: headers,
  }, (res) => {
    let responseBody;
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      if (!responseBody) {
        responseBody = chunk;
      } else {
        responseBody += chunk;
      }
    });
    res.on('end', function() {
      res.body = responseBody;
      return callback(res, null);
    });
  });
  proxyReq.on('error', (err) => {
    return callback(null, err);
  });
  if (bodyJson) {
    proxyReq.write(bodyJson);
  }
  proxyReq.end();

}

function sendProxiedHttpsRequest(
  method, remoteHostUrl, path, proxyUrl, headers, bodyJson, callback) {
  var connectReq = http.request({ // establishing a tunnel
    host: proxyUrl.hostname,
    port: proxyUrl.port,
    method: 'CONNECT',
    path: remoteHostUrl.href,
  });

  connectReq.on('connect', function(res, socket /*, head*/) {
    res.resume();
    if (res.statusCode !== 200) {
      return callback(null, new Error('Unexpected response code on CONNECT', res.statusCode));
    }

    var req = https.request({
      method: method,
      path: path,
      host: remoteHostUrl.host,
      timeout: 3000,
      socket: socket, // using a tunnel
      agent: false,    // cannot use a default agent
      headers: headers,
      // We can ignore the self-signed certs on the testing webserver
      // Cypress will also ignore this
      rejectUnauthorized: false
    }, function(res) {
      let responseBody;
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        if (!responseBody) {
          responseBody = chunk;
        } else {
          responseBody += chunk;
        }
      });
      res.on('end', function() {
        res.body = responseBody;
        return callback(res, null);
      });
    });

    req.on('error', (err) => {
      return callback(null, err);
    });

    if (bodyJson) {
      req.write(bodyJson);
    }
    req.end();
  });

  connectReq.on('error', (err) => {
    return callback(null, err);
  });
  connectReq.end();
}
