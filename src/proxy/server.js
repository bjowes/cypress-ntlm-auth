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
const HttpProxyAgent = require('http-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');

const debug = require('debug')('cypress:plugin:ntlm-auth');

const portsFile = require('../util/portsFile');
const configValidator = require('../util/configValidator');

let _ntlmHosts = {};
let _ntlmProxy;
const _configApp = express();
let _configAppListener;
let _ports;
let _ntlmProxyOwnsProcess;

let _upstreamHttpProxy;
let _upstreamHttpsProxy;
let _upstreamNoProxy;

const NtlmStateEnum = Object.freeze({ 'NotAuthenticated':0, 'Type1Sent':1, 'Type2Received':3, 'Type3Sent':4, 'Authenticated':5 });

function completeUrl(host, isSSL) {
  let hostUrl;

  if (host.indexOf('http://') !== -1) {
    isSSL = false;
    hostUrl = url.parse(host);
  } else if (host.indexOf('https://') !== -1) {
    isSSL = true;
    hostUrl = url.parse(host);
  } else {
    if (isSSL || (host.indexOf(':') !== -1 && host.split(':')[1] === '443')) {
      isSSL = true;
      hostUrl = url.parse('https://' + host);
    } else {
      hostUrl = url.parse('http://' + host);
    }
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
    workstation: config.workstation || ''
  };

  if (targetHost in _ntlmHosts) {
    // Remove existing authentication cache
    clearAuthenticated(targetHost);
  }
  _ntlmHosts[targetHost] = hostConfig;
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
  _upstreamHttpProxy = null;
  _upstreamHttpsProxy = null;
  _upstreamNoProxy = null;

  debug('Shutting down config API');
  _configAppListener.close(() => {
    _configAppListener = null;
    _ports = null;
    if (exitProcess) {
      // Failsafe in case some socket wasn't closed
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
    let validateResult = configValidator.validate(req.body);
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

function matchWithWildcardRule(str, rule) {
  return new RegExp('^' + rule.split('*').join('.*') + '$').test(str);
}

function targetInNoProxy(ntlmHost) {
  if (!_upstreamNoProxy) {
    return false;
  }

  let match = false;
  let ntlmHostUrl = url.parse(ntlmHost);
  _upstreamNoProxy.forEach(rule => {
    if (matchWithWildcardRule(ntlmHostUrl.hostname, rule)) {
      match = true;
    }
  });
  return match;
}

function setUpstreamProxyConfig(ntlmHost, isSSL, agentOptions) {
  let proxyUrl = null;

  if (targetInNoProxy(ntlmHost)) {
    return false;
  }
  if (isSSL && _upstreamHttpsProxy) {
    proxyUrl = _upstreamHttpsProxy;
  } else if (!isSSL && _upstreamHttpProxy) {
    proxyUrl = _upstreamHttpProxy;
  }
  if (proxyUrl) {
    agentOptions.host = proxyUrl.hostname;
    agentOptions.port = proxyUrl.port;
    agentOptions.protocol = proxyUrl.protocol;
    return true;
  }
  return false;
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
function getAgentFromClientSocket(clientSocket, isSSL, targetHost) {
  let clientAddress = getClientAddress(clientSocket);
  if (clientAddress in _agents) {
    return _agents[clientAddress].agent;
  }

  let agent = getAgent(isSSL, targetHost, true);
  agent._cyAgentId = agentCount;
  agentCount++;
  _agents[clientAddress] = { agent: agent, ntlm: {} };
  clientSocket.on('close', () => removeAgent('close', clientAddress));
  clientSocket.on('end', () => removeAgent('end', clientAddress));
  debug('Created NTLM ready agent for client ' + clientAddress + ' to target ' + targetHost);
  return agent;
}

function getNonNtlmAgent(isSSL, targetHost) {
  let agent = getAgent(isSSL, targetHost, false);
  agent._cyAgentId = agentCount;
  agentCount++;
  debug('Created non-NTLM agent for target ' + targetHost);
  return agent;
}

function getAgent(isSSL, targetHost, useNtlm) {
  let agentOptions = {
    keepAlive: useNtlm,
    rejectUnauthorized: !isLocalhost(targetHost) // Allow self-signed certificates if target is on localhost
  };
  if (useNtlm) {
    // Only one connection per peer -> 1:1 match between inbound and outbound socket
    agentOptions.maxSockets = 1;
  }
  let useUpstreamProxy = setUpstreamProxyConfig(
    targetHost, isSSL, agentOptions);
  let agent;
  if (useUpstreamProxy) {
    agent = isSSL ?
      new HttpsProxyAgent(agentOptions) :
      new HttpProxyAgent(agentOptions);
  } else {
    agent = isSSL ?
      new https.Agent(agentOptions) :
      new http.Agent(agentOptions);
  }
  return agent;
}

function removeAllAgents(event) {
  for (var property in _agents) {
    if (Object.hasOwnProperty(property)) {
      if (_agents[property].agent.destroy) {
        _agents[property].agent.destroy(); // Destroys any sockets to servers
      }
    }
  }
  _agents = {};
  debug('Removed all agents due to ' + event);
}

function removeAgent(event, clientAddress) {
  if (clientAddress in _agents) {
    if (_agents[clientAddress].agent.destroy) {
      _agents[clientAddress].agent.destroy(); // Destroys any sockets to servers
    }
    delete _agents[clientAddress];
    debug('Removed agent for ' + clientAddress + ' due to socket.' + event);
  } else {
    debug('RemoveAgent called but agent does not exist (socket.' + event + ' for ' + clientAddress);
  }
}

function isAuthenticated(clientSocket, targetHost) {
  let clientAddress = getClientAddress(clientSocket);
  let ntlm = _agents[clientAddress].ntlm;
  let auth = (targetHost in ntlm &&
    ntlm[targetHost] === NtlmStateEnum.Authenticated);
  return auth;
}

function setAuthenticationState(clientSocket, targetHost, authState) {
  let clientAddress = getClientAddress(clientSocket);
  _agents[clientAddress].ntlm[targetHost] = authState;
}

function getAuthenticationState(clientSocket, targetHost) {
  let clientAddress = getClientAddress(clientSocket);
  return _agents[clientAddress].ntlm[targetHost];
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

function validateUpstreamProxy(proxyUrl, parameterName) {
  if (!proxyUrl) {
    return false;
  }
  let proxyParsed = url.parse(proxyUrl);
  if (!proxyParsed.protocol || !proxyParsed.hostname || !proxyParsed.port || proxyParsed.path !== '/') {
    throw new Error('Invalid ' + parameterName + ' argument. It must be a complete URL without path. Example: http://proxy.acme.com:8080');
  }
  return true;
}

function upstreamProxySetup(httpProxy, httpsProxy, noProxy) {
  if (validateUpstreamProxy(httpProxy, 'HTTP_PROXY')) {
    _upstreamHttpProxy = url.parse(httpProxy);
  }
  if (validateUpstreamProxy(httpsProxy, 'HTTPS_PROXY')) {
    _upstreamHttpsProxy = url.parse(httpsProxy);
  }
  if (noProxy) { // May be a comma separated list of hosts
    _upstreamNoProxy = noProxy.split(',').map(item => item.trim());
  }
}

function startNtlmProxy(httpProxy, httpsProxy, noProxy, callback) {
  _ntlmProxy = httpMitmProxy();
  upstreamProxySetup(httpProxy, httpsProxy, noProxy);

  function ntlmHandshake(targetHost, ctx, callback) {
    let fullUrl = targetHost + ctx.clientToProxyRequest.url;
    let clientSocket = ctx.clientToProxyRequest.socket;
    setAuthenticationState(clientSocket, targetHost,
      NtlmStateEnum.NotAuthenticated);

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
      headers: {},
      agent: ctx.proxyToServerRequestOptions.agent,
    };
    requestOptions.headers['authorization'] = type1msg;
    requestOptions.headers['connection'] = 'keep-alive';
    let proto = ctx.isSSL ? https : http;
    let type1req = proto.request(requestOptions, (res) => {
      res.resume(); // Finalize the response so we can reuse the socket
      if (!res.headers['www-authenticate']) {
        debug('www-authenticate not found on response of second request during NTLM handshake with host', fullUrl);
        setAuthenticationState(clientSocket, targetHost,
          NtlmStateEnum.NotAuthenticated);
        return callback(new Error('www-authenticate not found on response of second request during NTLM handshake with host ' + fullUrl));
      }
      debug('received NTLM message type 2');
      setAuthenticationState(clientSocket, targetHost,
        NtlmStateEnum.Type2Received);
      let type2msg = ntlm.parseType2Message(res.headers['www-authenticate'], (err) => {
        if (err) {
          debug('Cannot parse NTLM message type 2 from host', fullUrl);
          setAuthenticationState(clientSocket, targetHost,
            NtlmStateEnum.NotAuthenticated);
          return callback(new Error('Cannot parse NTLM message type 2 from host ' + fullUrl));
        }
      });
      if (!type2msg) {
        // Let the error callback from parseType2Message process this
        return;
      }
      let type3msg = ntlm.createType3Message(type2msg, ntlmOptions);
      ctx.proxyToServerRequestOptions.headers['authorization'] = type3msg;
      debug('Sending NTLM message type 3 with initial client request');
      setAuthenticationState(clientSocket, targetHost, NtlmStateEnum.Type3Sent);
      return callback();
    });
    type1req.on('error', (err) => {
      debug('Error while sending NTLM message type 1:', err);
      setAuthenticationState(clientSocket, targetHost,
        NtlmStateEnum.NotAuthenticated);
      return callback(err);
    });
    debug('Sending  NTLM message type 1');
    setAuthenticationState(clientSocket, targetHost, NtlmStateEnum.Type1Sent);
    type1req.end();
  }

  function filterChromeStartup(ctx, errno, errorKind) {
    if (!ctx || !ctx.clientToProxyRequest || !errno) {
      return false;
    }
    let req = ctx.clientToProxyRequest;
    if (req.method === 'HEAD' &&
        req.url === '/' &&
        req.headers.host.indexOf('.') === -1 &&
        req.headers.host.indexOf(':') === -1 &&
        req.headers.host.indexOf('/') === -1 &&
        errorKind === 'PROXY_TO_SERVER_REQUEST_ERROR' &&
        errno === 'ENOTFOUND') {
      debug('Chrome startup HEAD request detected (host: ' + req.headers.host + '). Ignoring connection error.');
      return true;
    }
  }

  _ntlmProxy.onError(function (ctx, err, errorKind) {
    if (filterChromeStartup(ctx, err.errno, errorKind)) {
      return;
    }
    var url = (ctx && ctx.clientToProxyRequest) ? ctx.clientToProxyRequest.url : '';
    debug(errorKind + ' on ' + url + ':', err);
  });

  function filterConfigApiRequests(targetHost) {
    return (targetHost === _ports.configApiUrl);
  }

  _ntlmProxy.onRequest(function (ctx, callback) {
    let targetHost = getTargetHost(ctx);
    if (targetHost in _ntlmHosts) {
      debug('Request to ' + targetHost + ' in registered NTLM Hosts');
      ctx.proxyToServerRequestOptions.agent =
        getAgentFromClientSocket(ctx.clientToProxyRequest.socket,
          ctx.isSSL, targetHost);
      if (isAuthenticated(ctx.clientToProxyRequest.socket, targetHost)) {
        return callback();
      }

      ntlmHandshake(targetHost, ctx, (err) => {
        if (err) {
          debug('Cannot perform NTLM handshake. Let original message pass through');
        }
        return callback();
      });
    } else {
      if (!filterConfigApiRequests(targetHost)) {
        debug('Request to ' + targetHost + ' - pass on');
      }
      ctx.proxyToServerRequestOptions.agent =
        getNonNtlmAgent(ctx.isSSL, targetHost);
      return callback();
    }
  });

  function ntlmHandshakeResponse(ctx, targetHost, callback) {
    let clientSocket = ctx.clientToProxyRequest.socket;
    let authState = getAuthenticationState(clientSocket, targetHost);
    if (authState === NtlmStateEnum.NotAuthenticated) {
      // NTLM auth failed (host may not support NTLM), just pass it through
      return callback();
    }
    if (authState === NtlmStateEnum.Type3Sent) {
      if (ctx.serverToProxyResponse.statusCode === 401) {
        debug('NTLM authentication failed, invalid credentials.');
        setAuthenticationState(clientSocket, targetHost,
          NtlmStateEnum.NotAuthenticated);
        return callback();
      }
      // According to NTLM spec, all other responses than 401 shall be treated as authentication successful
      debug('NTLM authentication successful for host', targetHost);
      setAuthenticationState(clientSocket, targetHost,
        NtlmStateEnum.Authenticated);
      return callback();
    }

    debug('Response from server in unexpected NTLM state ' + authState + ', resetting NTLM auth.');
    setAuthenticationState(clientSocket, targetHost,
      NtlmStateEnum.NotAuthenticated);
    return callback();

  }

  _ntlmProxy.onResponse(function (ctx, callback) {
    let targetHost = getTargetHost(ctx);
    if (!(targetHost in _ntlmHosts)) {
      return callback();
    }

    if (isAuthenticated(ctx.clientToProxyRequest.socket, targetHost)) {
      return callback();
    }

    ntlmHandshakeResponse(ctx, targetHost, callback);
  });

  _ntlmProxy.onConnect(function (req, socket, head, callback) {
    /*
    // Prevents exceptions from client connection termination
    socket.on('error', function(err) {
      if (err.errno === 'ECONNRESET') {
        debug('socket used by CONNECT was reset by client.');
      } else {
        debug('socket used by CONNECT had an unexpected error', err);
      }
    });
*/

    let targetHost = completeUrl(req.url, true);
    if (targetHost in _ntlmHosts) {
      return callback();
    }

    if (_upstreamHttpsProxy) {
      // Don't tunnel if we need to go through an upstream proxy
      return callback();
    }

    // Let non-NTLM hosts tunnel through
    let reqUrl = url.parse(targetHost);

    debug('Tunnel to', req.url);
    var conn = net.connect({
      port: reqUrl.port,
      host: reqUrl.hostname,
      allowHalfOpen: true
    }, function () {
      conn.on('finish', () => {
        socket.destroy();
      });

      socket.write('HTTP/1.1 200 OK\r\n\r\n', 'UTF-8', function () {
        conn.write(head);
        conn.pipe(socket);
        socket.pipe(conn);
      });
    });


    conn.on('error', function (e) {
      debug('Tunnel error', e);
    });
  });

  getPort().then((port) => {
    _ntlmProxy.listen({ host: 'localhost', port: port, keepAlive: true, silent: true, forceSNI: false }, (err) => {
      if (err) {
        debug('Cannot start proxy listener', err);
        return callback(null, err);
      }
      debug('NTLM auth proxy listening on port:', port);
      return callback(port, null);
    });
  });
}

function stopOldProxy(allowMultipleProxies) {
  return new Promise((resolve, reject) =>  {
    if (portsFile.exists()) {
      portsFile.parse((ports, err) => {
        if (err) {
          return reject(err);
        }

        if (allowMultipleProxies) {
          debug('Existing proxy instance found, leave it running since multiple proxies are allowed');
          return resolve();
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
            return reject(new Error('Unexpected response from old proxy instance: ' + res.statusCode));
          }
          portsFile.delete((err) => {
            if (err) {
              return reject(err);
            }
            return resolve();
          });
        });
        quitReq.on('error', (err) => {
          debug('Quit request failed, trying to delete the ports file: ' + err);
          portsFile.delete((err) => {
            if (err) {
              return reject(err);
            }
            return resolve();
          });
        });
        quitReq.write(quitBody);
        quitReq.end();
      });
    } else {
      return resolve();
    }
  });
}

module.exports = {
  startProxy: function(httpProxy, httpsProxy, noProxy,
    ntlmProxyOwnsProcess, allowMultipleProxies, callback) {
    _ntlmProxyOwnsProcess = ntlmProxyOwnsProcess ? true : false;

    stopOldProxy(allowMultipleProxies)
      .then(() => {
        startNtlmProxy(httpProxy, httpsProxy, noProxy, (ntlmProxyPort, err) => {
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
                shutDownProxy(true, _ntlmProxyOwnsProcess);
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
  shutDown: function(keepPortsFile) {
    shutDownProxy(keepPortsFile, _ntlmProxyOwnsProcess);
  }
};
