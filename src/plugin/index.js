'use strict';

const debug = require("debug")("cypress:ntlm-auth-plugin");
const portsFile = require('../util/portsFile');
const url = require('url');
const http = require('http');

let _configApiUrl;
let _shutdownWithCypress = true;

process.on('SIGTERM', terminationSignal);
process.on('SIGINT', terminationSignal);
process.on('SIGQUIT', terminationSignal);

function terminationSignal() {
  debug('Detected termination signal');
  if (_shutdownWithCypress) {
    sendQuitCommand();
  }
}

function sendQuitCommand() {
  let configApiUrl = url.parse(_configApiUrl);
  debug('sending shutdown command to NTLM proxy');
  let quitBody = JSON.stringify({ keepPortsFile: false });
  let quitReq = http.request({
    method: 'POST',
    path: '/quit',
    host: configApiUrl.hostname,
    port: configApiUrl.port,
    timeout: 15000,
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(quitBody)
    }
  }, function (res) {
    res.resume();
    if (res.statusCode !== 200) {
      debug('Unexpected response from NTLM proxy: ' + res.statusCode);
      throw new Error('Unexpected response from NTLM proxy: ' + res.statusCode);
    }
    debug('shutdown successful');
  });
  quitReq.on('error', (err) => {
    debug('shutdown request failed: ' + err);
    throw new Error('shutdown request failed: ' + err);
  });
  quitReq.write(quitBody);
  quitReq.end();
}

module.exports = {
  initNtlmAuth: function(config) {
    return new Promise((resolve, reject) => {
      portsFile.parsePortsFile((ports, err) => {
        if (err) {
          reject(err);
        }
        config.env.NTLM_AUTH_PROXY = ports.ntlmProxyUrl;
        config.env.NTLM_AUTH_API = ports.configApiUrl;
        debug(config.env);
        if ('NTLM_AUTH_SHUTDOWN_WITH_CYPRESS' in config.env) {
          debug(config.env.NTLM_AUTH_SHUTDOWN_WITH_CYPRESS);
          _shutdownWithCypress = config.env.NTLM_AUTH_SHUTDOWN_WITH_CYPRESS == true;
        }
        _configApiUrl = ports.configApiUrl;
        resolve(config);  
      });   
    });
  },
  validateBrowser: function(browser = {}) {
    if (browser.name !== 'chrome') {
      debug('NTLM auth plugin only validated with Chrome browser. Detected ' + browser.name + ', use at your own risk!');
    }
  }
}
