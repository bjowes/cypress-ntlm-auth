'use strict';

const debug = require('debug')('cypress:ntlm-auth-plugin');
const portsFile = require('../util/portsFile');
const url = require('url');
const http = require('http');
const nodeCleanup = require('node-cleanup');

let _configApiUrl;
let _shutdownWithCypress = true;

nodeCleanup((exitCode, signal) => {
  if (exitCode) {
    debug('Detected process exit with code', exitCode);
  }
  if (signal) {
    debug('Detected termination signal', signal);
  }
  if (_shutdownWithCypress) {
    sendQuitCommand();
  }
});

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

function validateEnvironment(ports, callback) {
  if (!process.env.HTTP_PROXY) {
    debug('Error: HTTP_PROXY environment variable not set');
    return callback(new Error('HTTP_PROXY environment variable not set. Make sure cypress is started using the cypress-ntlm launcher.'));
  }
  if (process.env.HTTP_PROXY !== ports.ntlmProxyUrl) {
    debug('Error: HTTP_PROXY environment variable (' + process.env.HTTP_PROXY + ') ' +
      'is not set to current NTLM proxy url (' + ports.ntlmProxyUrl + ').');
    return callback(new Error('HTTP_PROXY environment variable is not set to ' +
      'current NTLM proxy url (' + ports.ntlmProxyUrl +'). '+
      'Make sure cypress is started using the cypress-ntlm launcher.'));
  }
  return callback();
}

function setupProxyEnvironment(config, ports) {
  config.env.NTLM_AUTH_PROXY = ports.ntlmProxyUrl;
  config.env.NTLM_AUTH_API = ports.configApiUrl;
  if ('NTLM_AUTH_SHUTDOWN_WITH_CYPRESS' in config.env) {
    _shutdownWithCypress =
      (config.env.NTLM_AUTH_SHUTDOWN_WITH_CYPRESS === 'true' ||
       config.env.NTLM_AUTH_SHUTDOWN_WITH_CYPRESS === true);
  }
  _configApiUrl = ports.configApiUrl;
  return config;
}

module.exports = {
  initNtlmAuth: function(config) {
    return new Promise((resolve, reject) => {
      portsFile.parse((ports, err) => {
        if (err) {
          reject(err);
        }
        validateEnvironment(ports, (err) => {
          if (err) {
            reject(err);
          }
          config = setupProxyEnvironment(config, ports);
          resolve(config);
        });
      });
    });
  }
};
