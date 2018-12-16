'use strict';

const httpntlm = require('httpntlm');
const express = require('express');
const bodyParser = require('body-parser');
//const HOST = ntlmHost;
const log = require('debug')('cypress:ntlm');
const url = require('url');

let _options = {};
let _ntlmHost;
const _ntlmApp = express();
let _ntlmAppListener;
const _configApp = express();
let _configAppListener;

let _upstreamHttpProxy;
let _upstreamHttpsProxy;

function isEmpty(obj) {
  // because Object.keys(new Date()).length === 0;
  // we have to do some additional check
  return (Object.keys(obj).length === 0 && obj.constructor === Object);
}

function updateConfig(config) {
  _ntlmHost = config.ntlmHost;
  _options.username = config.username;
  _options.password = config.password;
  _options.domain = config.domain;
  _options.workstation = config.workstation;
  _options.proxy = getUpstreamProxyConfig(_ntlmHost);
}

function validateConfig(config) {
  if (!config.ntlmHost || 
    !config.username || 
    !config.password || 
    !(config.domain || config.workstation)) {
    return {ok: false, message: 'Incomplete configuration. ntlmHost, username, password and either domain or workstation are required fields.'};
  }

  let urltest = url.parse(config.ntlmHost);
  if (!urltest.protocol || !urltest.hostname) {
    return {ok: false, message: 'Invalid ntlmHost, must be complete URL (like https://www.google.com)'};
  }

  return {ok: true};
}

function startConfigApi() {
  _configApp.use(bodyParser.json());
  _configApp.post('/ntlm-config', (req, res, next) => {
    let validateResult = validateConfig(req.body);
    if (!validateResult.ok) {
      res.status(400).send('Config parse error. ' + validateResult.message);
    } else {
      updateConfig(req.body);
      res.sendStatus(200);
    }
  });

  _configAppListener = _configApp.listen();
  let port = _configAppListener.address().port;
  if (!port) {
    throw new Error('Cannot start NTLM auth config API');
  }
  log('NTLM auth config API listening on port: ' + port);
  return port;
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

function startNtlmProxy(httpProxy, httpsProxy) {
  _options.allowRedirects = true;
  _options.timeout = 60000;
  _upstreamHttpProxy = httpProxy;
  _upstreamHttpsProxy = httpsProxy;

  _ntlmApp.use(bodyParser.raw());
  _ntlmApp.all('*', (req, res, next) => {
    let method = req.method.toLowerCase();
    let url = req.originalUrl;
    let fullUrl = _ntlmHost + url;
    
    if (!isEmpty(req.body)) {
      _options.body = req.body;
    }
    _options.headers = req.headers;
    _options.cookies = req.cookies;
    _options.url = fullUrl;


    console.log(_options);
    httpntlm[method](_options, function (err, response){
      if(err) {
        log(err.message);
        if (err.message === 'www-authenticate not found on response of second request') {
          throw new Error('The configured baseUrl host (' + HOST + ') does not support NTLM authentication. Enter the correct baseUrl or disable the NTML plugin.');
        }
        throw err;
      }
      res.set(response.headers);
      res.status(response.statusCode);
      res.send(response.body);
    });    
  });

  _ntlmAppListener = _ntlmApp.listen();
  let port = _ntlmAppListener.address().port;
  if (!port) {
    throw new Error('Cannot start NTLM auth proxy');
  }
  log('NTLM auth proxy listening on port: ' + port);
  return port;
}

module.exports = {
  startProxy: function(httpProxy, httpsProxy) {
    let ntlmProxyPort = startNtlmProxy(httpProxy, httpsProxy);
    let configApiPort = startConfigApi();
    let ports = { ntlmProxyPort: ntlmProxyPort, configApiPort: configApiPort };
    return ports;
  }
};
//var async = require('async');
//var httpreq = require('httpreq');
/*
var HttpsAgent = require('agentkeepalive').HttpsAgent;
var keepaliveAgent = new HttpsAgent();
*/

/*
const httpProxy = require('http-proxy');
const Agent = require('agentkeepalive');

let agent =  new Agent({
  maxSockets: 100,
  keepAlive: true,
  maxFreeSockets: 10,
  keepAliveMsecs:1000,
  timeout: 60000,
  keepAliveTimeout: 30000 // free socket keepalive for 30 seconds
});

let proxy = httpProxy.createProxy({ target: 'http://whatever.com', agent: agent });

//
// Modify headers of the response before it gets sent
// So that we handle the NLTM authentication response
//
proxy.on('proxyRes', function (proxyRes) {
  let key = 'www-authenticate';
  proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
});

require('http').createServer(function (req, res) {
  proxy.web(req, res);
}).listen(3000);
*/
