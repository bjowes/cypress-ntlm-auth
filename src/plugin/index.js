'use strict';

const debug = require('debug')('cypress:plugin:ntlm-auth');
const portsFile = require('../util/portsFile');

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
