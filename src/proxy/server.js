'use strict';

const getPort = require('get-port');
const httpMitmProxy = require('http-mitm-proxy');
const net = require('net');
const ntlm = require('httpntlm').ntlm;
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const url = require('url');

const debug = require('debug')('cypress:ntlm-auth-plugin');

const portsFile = require('../util/portsFile');

let _ntlmHosts = {};
let _ntlmProxy;
const _configApp = express();
let _configAppListener;
let _ports;
let _ntlmProxyOwnsProcess;

let _upstreamHttpProxy;
let _upstreamHttpsProxy;

function completeUrl(host, isSSL) {
  let hostUrl = url.parse(host);
  if (hostUrl.port === '443') {
    isSSL = true;
  }
  if (!hostUrl.protocol) {
    hostUrl.protocol = isSSL ? 'https:' : 'http:';
  }
  if (!hostUrl.port) {
    hostUrl.port = isSSL ? '443' : '80';
  }

  return hostUrl.href;
}

function updateConfig(config) {
  let targetHost = completeUrl(config.ntlmHost);
  let hostConfig = {
    host: targetHost,
    username: config.username,
    password: config.password,
    domain: config.domain || '',
    workstation: config.workstation || '',
    proxy: getUpstreamProxyConfig(config.ntlmHost)
  };

  if (targetHost in _ntlmHosts) {
    // Remove existing authentication cache
    clearAuthenticated(targetHost);
  }
  _ntlmHosts[targetHost] = hostConfig;
}

function validateConfig(config) {
  if (!config.ntlmHost ||
    !config.username ||
    !config.password ||
    !(config.domain || config.workstation)) {
    return { ok: false, message: 'Incomplete configuration. ntlmHost, username, password and either domain or workstation are required fields.' };
  }

  let urlTest = url.parse(config.ntlmHost);
  if (!urlTest.hostname) {
    return { ok: false, message: 'Invalid ntlmHost, must be a valid URL (like https://www.google.com)' };
  }

  return { ok: true };
}

function shutDownProxy(keepPortsFile, exitProcess) {
  debug('Shutting down');

  if (!keepPortsFile) {
    portsFile.delete((err) => {
      if (err) {
        debug(err);
      }
    });
  }

  debug('Shutting down NTLM proxy');
  resetProxy();
  _ntlmProxy.close();
  _ntlmProxy = null;
  debug('Shutting down config API');
  _configAppListener.close(() => {
    _configAppListener = null;
    if (exitProcess) {
      process.exit(0);
    }
  });

  if (exitProcess) {
    validateShutDown(50);
  }
}

function validateShutDown(shutDownRetry) {
  if (!_ntlmProxy && !_configAppListener) {
    process.exit(0);
  }
  if (shutDownRetry === 0) {
    debug('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }
  setTimeout(() => {
 validateShutDown(shutDownRetry - 1);
}, 100);
}

function resetProxy() {
  // Clear config
  _ntlmHosts = {};
  // Clear agents
  removeAllAgents('reset');
}

function startConfigApi(callback) {
  _configApp.use(bodyParser.json());

  _configApp.post('/ntlm-config', (req, res) => {
    let validateResult = validateConfig(req.body);
    if (!validateResult.ok) {
      res.status(400).send('Config parse error. ' + validateResult.message);
    } else {
      debug('Received valid config update');
      updateConfig(req.body);
      res.sendStatus(200);
    }
  });

  _configApp.post('/reset', (req, res) => {
    debug('Received reset');
    resetProxy();
    res.sendStatus(200);
  });

  _configApp.get('/alive', (req, res) => {
    debug('Received alive');
    res.sendStatus(200);
  });

  _configApp.post('/quit', (req, res) => {
    debug('Received quit');
    res.status(200).send('Over and out!');
    shutDownProxy(req.body.keepPortsFile, _ntlmProxyOwnsProcess);
  });

  getPort().then((port) => {
    _configAppListener = _configApp.listen(port, (err) => {
      if (err) {
        debug('Cannot start NTLM auth config API');
        return callback(null, err);
      }
      debug('NTLM auth config API listening on port:', port);
      return callback(port, null);
    });
  });
}

function getUpstreamProxyConfig(ntlmHost) {
  let hostUrl = url.parse(ntlmHost);
  let proxy = null;
  let proxyUrl = null;

  if (hostUrl.protocol === 'https:' && _upstreamHttpsProxy) {
    proxyUrl = url.parse(_upstreamHttpsProxy);
  } else if (hostUrl.protocol === 'http:' && _upstreamHttpProxy) {
    proxyUrl = url.parse(_upstreamHttpProxy);
  }
  if (proxyUrl) {
    proxy = {
      host: proxyUrl.hostname,
      port: proxyUrl.port,
      protocol: proxyUrl.protocol.slice(0, -1) // remove trailing ':'
    };
  }
  return proxy;
}

function isLocalhost(host) {
  let hostUrl = url.parse(host);
  return (hostUrl.hostname === 'localhost' || hostUrl.hostname === '127.0.0.1');
}

function getTargetHost(ctx) {
  let host = ctx.clientToProxyRequest.headers.host;
  return completeUrl(host, ctx.isSSL);
}

function getClientAddress(clientSocket) {
  return clientSocket.remoteAddress + ':' + clientSocket.remotePort;
}

let _agents = {};
let agentCount = 0;
function getAgent(clientSocket, isSSL, targetHost) {
  let clientAddress = getClientAddress(clientSocket);
  if (clientAddress in _agents) {
    return _agents[clientAddress].agent;
  }

  // Allow self-signed certificates if target is on localhost
  let rejectUnauthorized = !isLocalhost(targetHost);

  let agentOptions = {
    keepAlive: true,
    maxSockets: 1, // Only one connection per peer -> 1:1 match between inbound and outbound socket
    rejectUnauthorized: rejectUnauthorized
  };
  let agent = isSSL ?
    new https.Agent(agentOptions) :
    new http.Agent(agentOptions);
  agent._cyAgentId = agentCount;
  agentCount++;
  _agents[clientAddress] = { agent: agent, ntlm: {} };
  clientSocket.on('close', () => removeAgent('close', clientAddress));
  clientSocket.on('end', () => removeAgent('end', clientAddress));
  debug('Created agent for ' + clientAddress);
  return agent;
}

function removeAllAgents(event) {
  for (var property in _agents) {
    if (Object.hasOwnProperty(property)) {
      _agents[property].agent.destroy(); // Destroys any sockets to servers
    }
  }
  _agents = {};
  debug('Removed all agents due to ' + event);
}

function removeAgent(event, clientAddress) {
  if (clientAddress in _agents) {
    _agents[clientAddress].agent.destroy(); // Destroys any sockets to servers
    delete _agents[clientAddress];
    debug('Removed agent for ' + clientAddress + ' due to socket.' + event);
  } else {
    debug('RemoveAgent called but agent does not exist (socket.' + event + ' for ' + clientAddress);
  }
}

function isAuthenticated(clientSocket, targetHost) {
  let clientAddress = getClientAddress(clientSocket);
  let ntlm = _agents[clientAddress].ntlm;
  let auth = (targetHost in ntlm && ntlm[targetHost]);
  return auth;
}

function setAuthenticated(clientSocket, targetHost, auth) {
  let clientAddress = getClientAddress(clientSocket);
  _agents[clientAddress].ntlm[targetHost] = auth;
}

function clearAuthenticated(targetHost) {
  for (var property in _agents) {
    if (Object.hasOwnProperty(property)) {
      let ntlm = _agents[property].ntlm;
      if (targetHost in ntlm) {
        delete ntlm[targetHost];
      }
    }
  }
}

function startNtlmProxy(httpProxy, httpsProxy, callback) {
  _ntlmProxy = httpMitmProxy();
  // TODO implement and verify with upstream proxy
  _upstreamHttpProxy = httpProxy;
  _upstreamHttpsProxy = httpsProxy;

  function ntlmHandshake(targetHost, ctx, callback) {
    let fullUrl = targetHost + ctx.clientToProxyRequest.url;
    let ntlmOptions = {
      username: _ntlmHosts[targetHost].username,
      password: _ntlmHosts[targetHost].password,
      domain: _ntlmHosts[targetHost].domain,
      workstation: _ntlmHosts[targetHost].workstation,
      url: fullUrl
    };
    let type1msg = ntlm.createType1Message(ntlmOptions);
    let requestOptions = {
      method: ctx.proxyToServerRequestOptions.method,
      path: ctx.proxyToServerRequestOptions.path,
      host: ctx.proxyToServerRequestOptions.host,
      port: ctx.proxyToServerRequestOptions.port,
      headers: JSON.parse(
        JSON.stringify(ctx.proxyToServerRequestOptions.headers)), // Deep copy
      agent: ctx.proxyToServerRequestOptions.agent,
    };
    requestOptions.headers['authorization'] = type1msg;
    requestOptions.headers['connection'] = 'keep-alive';
    let proto = ctx.isSSL ? https : http;
    let type1req = proto.request(requestOptions, (res) => {
      res.resume(); // Finalize the response so we can reuse the socket
      if (!res.headers['www-authenticate']) {
        debug('www-authenticate not found on response of second request during NTLM handshake with host', fullUrl);
        return callback(new Error('www-authenticate not found on response of second request during NTLM handshake with host ' + fullUrl));
      }
      debug('received NTLM message type 2');
      let type2msg = ntlm.parseType2Message(res.headers['www-authenticate'], (err) => {
        if (err) {
          debug('Cannot parse NTLM message type 2 from host', fullUrl);
          return callback(new Error('Cannot parse NTLM message type 2 from host ' + fullUrl));
        }
      });
      if (!type2msg) {
        // Let the error callback from parseType2Message process this
        return;
      }
      let type3msg = ntlm.createType3Message(type2msg, ntlmOptions);
      ctx.proxyToServerRequestOptions.headers['authorization'] = type3msg;
      debug('Sending NTLM message type 3 with initial client request - handshake complete');
      return callback();
    });
    type1req.on('error', (err) => {
      debug('Error while sending NTLM message type 1:', err);
      return callback(err);
    });
    debug('Sending  NTLM message type 1');
    type1req.end();
  }

  _ntlmProxy.onError(function (ctx, err, errorKind) {
    var url = (ctx && ctx.clientToProxyRequest) ? ctx.clientToProxyRequest.url : '';
    debug(errorKind + ' on ' + url + ':', err);
  });

  _ntlmProxy.onRequest(function (ctx, callback) {
    let targetHost = getTargetHost(ctx);
    if (targetHost in _ntlmHosts) {
      debug('Request to ' + targetHost + ' in registered NTLM Hosts');
      ctx.proxyToServerRequestOptions.agent =
        getAgent(ctx.clientToProxyRequest.socket, ctx.isSSL, targetHost);

      if (isAuthenticated(ctx.clientToProxyRequest.socket, targetHost)) {
        return callback();
      }
      setAuthenticated(ctx.clientToProxyRequest.socket, targetHost, false);

      ntlmHandshake(targetHost, ctx, (err) => {
        if (err) {
          debug('Cannot perform NTLM handshake. Let original message pass through');
          return callback();
        }
        setAuthenticated(ctx.clientToProxyRequest.socket, targetHost, true);
        return callback();
      });
    } else {
      debug('Request to ' + targetHost + ' - pass on');
      return callback();
    }
  });

  _ntlmProxy.onConnect(function (req, socket, head, callback) {
    let targetHost = completeUrl(req.url, true);
    if (targetHost in _ntlmHosts) {
      return callback();
    }

    // Let non-proxied hosts tunnel through
    let reqUrl = url.parse(req.url);

    debug('Tunnel to', req.url);
    var conn = net.connect(reqUrl.port, reqUrl.hostname, function () {
      socket.write('HTTP/1.1 200 OK\r\n\r\n', 'UTF-8', function () {
        conn.pipe(socket);
        socket.pipe(conn);
      });
    });

    conn.on('error', function (e) {
      debug('Tunnel error', e);
    });
  });

  getPort().then((port) => {
    _ntlmProxy.listen({ host: 'localhost', port: port, keepAlive: false, silent: true, forceSNI: false }, (err) => {
      if (err) {
        debug('Cannot start proxy listener', err);
        return callback(null, err);
      }
      debug('NTLM auth proxy listening on port:', port);
      return callback(port, null);
    });
  });
}

function stopOldProxy() {
  return new Promise((resolve, reject) =>  {
    if (portsFile.exists()) {
      portsFile.parse((ports, err) => {
        if (err) {
          reject(err);
        }

        let configApiUrl = url.parse(ports.configApiUrl);
        debug('Existing proxy instance found, sending shutdown');
        let quitBody = JSON.stringify({ keepPortsFile: true });
        let quitReq = http.request({
          method: 'POST',
          path: '/quit',
          host: configApiUrl.hostname,
          port: configApiUrl.port,
          timeout: 15000,
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            'content-length': Buffer.byteLength(quitBody)
          }
        }, function (res) {
          res.resume();
          if (res.statusCode !== 200) {
            debug('Unexpected response from old proxy instance: ' + res.statusCode);
            reject(new Error('Unexpected response from old proxy instance: ' + res.statusCode));
          }
          portsFile.delete((err) => {
            if (err) {
              reject(err);
            }
            resolve();
          });
        });
        quitReq.on('error', (err) => {
          debug('Quit request failed, trying to delete the ports file: ' + err);
          portsFile.delete((err) => {
            if (err) {
              reject(err);
            }
            resolve();
          });
        });
        quitReq.write(quitBody);
        quitReq.end();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  startProxy: function(httpProxy, httpsProxy, ntlmProxyOwnsProcess, callback) {
    _ntlmProxyOwnsProcess = ntlmProxyOwnsProcess ? true : false;
    stopOldProxy()
      .then(() => {
        startNtlmProxy(httpProxy, httpsProxy, (ntlmProxyPort, err) => {
          if (err) {
            return callback(null, err);
          }
          startConfigApi((configApiPort, err) =>  {
            if (err) {
              return callback(null, err);
            }
            _ports = {
              ntlmProxyUrl: 'http://127.0.0.1:' + ntlmProxyPort,
              configApiUrl: 'http://127.0.0.1:' + configApiPort
            };
            portsFile.save(_ports, (err) => {
              if (err) {
                shutDownProxy(true);
                return callback(null, err);
              }
              return callback(_ports, null);
            });
          });
        });
      })
      .catch((err) => {
        return callback(null, err);
      });
    },
  shutDown: function(keepPortsFile, exitProcess) {
    shutDownProxy(keepPortsFile, exitProcess);
  }
};
