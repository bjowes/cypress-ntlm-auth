'use strict';

const getPort = require('get-port');
const MitmProxy = require('http-mitm-proxy');
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

function updateConfig(config) {
  let hostConfig = {
    host: config.ntlmHost,
    username: config.username,
    password: config.password,
    domain: config.domain || '',
    workstation: config.workstation || '',
    proxy: getUpstreamProxyConfig(config.ntlmHost)
  }

  if (config.ntlmHost in _ntlmHosts) {
    // Remove existing authentication cache
    clearAuthenticated(config.ntlmHost);
  }
  _ntlmHosts[config.ntlmHost] = hostConfig;
}

function validateConfig(config) {
  if (!config.ntlmHost ||
    !config.username ||
    !config.password ||
    !(config.domain || config.workstation)) {
    return { ok: false, message: 'Incomplete configuration. ntlmHost, username, password and either domain or workstation are required fields.' };
  }

  let urltest = url.parse(config.ntlmHost);
  if (!urltest.protocol || !urltest.hostname) {
    return { ok: false, message: 'Invalid ntlmHost, must be complete URL (like https://www.google.com)' };
  }

  return { ok: true };
}

process.on('SIGTERM', terminationSignal);
process.on('SIGINT', terminationSignal);
process.on('SIGQUIT', terminationSignal);

function terminationSignal() {
  debug('Detected termination signal');
  shutDownProxy(false);
}

function shutDownProxy(keepPortsFile) {
  debug('Shutting down');

  if (!keepPortsFile) {
    portsFile.deletePortsFile((err) => {
      if (err) {
        debug(err);
      }
    });
  }

  debug('Shutting down NTLM proxy');
  _ntlmProxy.close();
  _ntlmProxy = null;
  debug('Shutting down config API');
  _configAppListener.close(() => {
    _configAppListener = null;
    if (_ntlmProxyOwnsProcess) {
      process.exit(0);
    }
  });

  if (_ntlmProxyOwnsProcess) {
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
  setTimeout(() => { validateShutDown(shutDownRetry - 1) }, 100);
}

// TODO - can we really change the port on reset?
function resetProxy() {
  // Clear config
  _ntlmHosts = {};
  // Clear agents
  removeAllAgents('reset');
}

function startConfigApi(callback) {
  _configApp.use(bodyParser.json());

  _configApp.post('/ntlm-config', (req, res, next) => {
    let validateResult = validateConfig(req.body);
    if (!validateResult.ok) {
      res.status(400).send('Config parse error. ' + validateResult.message);
    } else {
      debug('received valid config update');
      updateConfig(req.body);
      res.sendStatus(200);
    }
  });

  _configApp.post('/reset', (req, res, next) => {
    debug('received reset');
    resetProxy();
    res.sendStatus(200);
  });

  _configApp.get('/alive', (req, res, next) => {
    debug('received alive');
    res.sendStatus(200);
  });

  _configApp.post('/quit', (req, res, next) => {
    debug('received quit');
    res.status(200).send('Over and out!');
    shutDownProxy(req.body.keepPortsFile);
  });

  getPort(7900).then((port) => {
    _configAppListener = _configApp.listen(port, (err) => {
      if (err) {
        debug('Cannot start NTLM auth config API');
        return callback(null, err);
      }
      debug('NTLM auth config API listening on port: ' + port);
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

function getTargetHost(ctx) {
  let protocol = ctx.isSSL ? 'https://' : 'http://'; // TODO ?
  let host = ctx.clientToProxyRequest.headers.host;
  let targetHost = protocol + host;
  return targetHost;
}

function getClientAddress(clientSocket) {
  return clientSocket.remoteAddress + ':' + clientSocket.remotePort;
}

let _agents = {};
let agentCount = 0;
function getAgent(clientSocket, isSSL, targetHost) {
  let clientAddress = getClientAddress(clientSocket);
  if (clientAddress in _agents) return _agents[clientAddress].agent;

  let targetUrl = url.parse(targetHost);
  // Allow self-signed certificates if target is on localhost
  let rejectUnauthorized = (targetHost.hostname == 'localhost' || targetHost.hostname == '127.0.0.1');

  let agentOptions = {
    keepAlive: true,
    maxSockets: 1, // Only one connection per peer -> 1:1 match between inbound and outbound socket
    rejectUnauthorized: rejectUnauthorized
  }
  let agent = isSSL ? new https.Agent(agentOptions) : new http.Agent(agentOptions);
  agent._cyAgentId = agentCount;
  agentCount++;
  _agents[clientAddress] = { agent: agent, ntlm: {} };
  clientSocket.on('close', () => removeAgent('close', clientAddress));
  clientSocket.on('end', () => removeAgent('end', clientAddress));
  debug('created agent for ' + clientAddress);
  return agent;
}

function removeAllAgents(event) {
  for (var property in _agents) {
    if (object.hasOwnProperty(property)) {
      _agents[property].agent.destroy(); // Destroys any sockets to servers
    }
  }
  _agents = {};
  debug('removed all agents due to ' + event);
}

function removeAgent(event, clientAddress) {
  if (clientAddress in _agents) {
    _agents[clientAddress].agent.destroy(); // Destroys any sockets to servers
    delete _agents[clientAddress];
    debug('removed agent for ' + clientAddress + ' due to socket.' + event);
  } else {
    debug('removeAgent called but agent does not exist (socket.' + event + ' for ' + clientAddress);
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
    if (object.hasOwnProperty(property)) {
      let ntlm = _agents[property].ntlm;
      if (targetHost in ntlm) {
        delete ntlm[targetHost];
      }
    }
  }
}

function startNtlmProxy(httpProxy, httpsProxy, callback) {
  _ntlmProxy = MitmProxy();
  // TODO implement and verify with upstream proxy
  _upstreamHttpProxy = httpProxy;
  _upstreamHttpsProxy = httpsProxy;

  _ntlmProxy.onError(function (ctx, err, errorKind) {
    var url = (ctx && ctx.clientToProxyRequest) ? ctx.clientToProxyRequest.url : "";
    debug(errorKind + ' on ' + url + ':', err);
  });

  _ntlmProxy.onRequest(function (ctx, callback) {
    let targetHost = getTargetHost(ctx);
    if (targetHost in _ntlmHosts) {
      debug('request to ' + targetHost + ' in registered NTLM Hosts');
      ctx.proxyToServerRequestOptions.agent = getAgent(ctx.clientToProxyRequest.socket, ctx.isSSL, targetHost);

      if (isAuthenticated(ctx.clientToProxyRequest.socket, targetHost)) {
        return callback();
      }
      setAuthenticated(ctx.clientToProxyRequest.socket, targetHost, false);

      let fullUrl = targetHost + ctx.clientToProxyRequest.url;

      let ntlmOptions = {
        username: _ntlmHosts[targetHost].username,
        password: _ntlmHosts[targetHost].password,
        domain: _ntlmHosts[targetHost].domain,
        workstation: _ntlmHosts[targetHost].workstation,
        url: fullUrl
      };
      let type1msg = ntlm.createType1Message(ntlmOptions);
      let requestOptions = ctx.proxyToServerRequestOptions;
      requestOptions.headers['authorization'] = type1msg;
      requestOptions.headers['connection'] = 'keep-alive';
      let proto = ctx.isSSL ? https : http;
      let type1req = proto.request(requestOptions, (res) => {
        res.resume(); // Finalize the response so we can reuse the socket
        if (!res.headers['www-authenticate']) {
          debug('www-authenticate not found on response of second request during NTLM handshake with host ' + fullUrl);
          // configured host likely does not support NTLM. Let original request pass through
          return callback();
        }
        debug('received NTLM message type 2');
        var type2msg = ntlm.parseType2Message(res.headers['www-authenticate'], (err) => {
          debug('cannot parse NTLM message type 2 from host ' + fullUrl);
          // configured host likely does not support NTLM. Let original request pass through
          return callback();
        });
        var type3msg = ntlm.createType3Message(type2msg, ntlmOptions);
        ctx.proxyToServerRequestOptions.headers['authorization'] = type3msg;
        ctx.proxyToServerRequestOptions.headers['connection'] = ctx.clientToProxyRequest.headers['connection'];
        setAuthenticated(ctx.clientToProxyRequest.socket, targetHost, true);
        debug('sending  NTLM message type 3 with initial client request - handshake complete');
        return callback();
      });
      debug('sending  NTLM message type 1');
      type1req.end();

    } else {
      debug('request to ' + targetHost + ' - pass on');
      return callback();
    }
  });

  _ntlmProxy.onConnect(function (req, socket, head, callback) {
    let targetHost = 'https://' + req.url;
    if (targetHost in _ntlmHosts) { return callback(); }

    // Let non-proxied hosts tunnel through
    var host = req.url.split(":")[0];
    var port = req.url.split(":")[1];

    debug('Tunnel to', req.url);
    var conn = net.connect(port, host, function () {
      socket.write('HTTP/1.1 200 OK\r\n\r\n', 'UTF-8', function () {
        conn.pipe(socket);
        socket.pipe(conn);
      })
    });

    conn.on("error", function (e) {
      debug('Tunnel error', e);
    })
  });

  getPort(7800).then((port) => {
    _ntlmProxy.listen({ host: 'localhost', port: port, keepAlive: false, silent: true, forceSNI: false }, (err) => {
      if (err) {
        debug('cannot start proxy listener');
        return callback(null, err);
      }  
      debug('NTLM auth proxy listening on port: ' + port);
      return callback(port, null)
    });
  });
}

function stopOldProxy() {
  return new Promise((resolve, reject) =>  {
    if (portsFile.portsFileExists()) {      
      portsFile.parsePortsFile((ports, err) => {
        if (err) {
          reject(err);
        }
  
        let configApiUrl = url.parse(ports.configApiUrl);
        debug('existing proxy instance found, sending shutdown');
        let quitBody = JSON.stringify({ keepPortsFile: true });
        let quitreq = http.request({
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
          portsFile.deletePortsFile((err) => {
            if (err) {
              reject(err);
            }
            resolve();
          });
        });
        quitreq.on('error', (err) => {
          debug('quit request failed, try deleting the ports file');
          portsFile.deletePortsFile((err) => {
            if (err) {
              reject(err);
            }
            resolve();
          });
        });
        quitreq.write(quitBody);
        quitreq.end();
      });
    } else {
      resolve(); 
    }
  });
}

module.exports = {
  startProxy: function (httpProxy, httpsProxy, ntlmProxyOwnsProcess, callback) {
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
            portsFile.savePortsFile(_ports, (err) => {
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
    }
};
