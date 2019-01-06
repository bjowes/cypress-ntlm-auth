'use strict';

const getPath = require('platform-folders');
const fs = require('fs');
const path = require('path');
const url = require('url');
const debug = require('debug')('cypress:ntlm-auth-plugin');

const portsFileName = 'cypress-ntlm-auth.port';
const portsFile = path.join(getPath.getDataHome(), portsFileName);

module.exports = {
  delete: function (callback) {
    fs.unlink(portsFile, function (err) {
      if (err) {
        debug(err);
        return callback(new Error('Cannot delete ' + portsFile));
      }
      return callback(null);
    });
  },

  save: function (ports, callback) {
    fs.writeFile(portsFile, JSON.stringify(ports),
      function (err) {
        if (err) {
          debug(err);
          return callback(new Error('Cannot create ' + portsFile));
        } else {
          debug('wrote ' + portsFile);
        }
        return callback(null);
      });
  },

  exists: function () {
    return fs.existsSync(portsFile);
  },

  parse: function (callback) {
    if (fs.existsSync(portsFile)) {
      let data = fs.readFileSync(portsFile);
      let ports;
      try {
        ports = JSON.parse(data);
      } catch (err) {
        return callback(null, err);
      }
      if (validatePortsFile(ports)) {
        return callback(ports, null);
      }
      return callback(null, new Error('Cannot parse ' + portsFile));
    } else {
      return callback(null, new Error('cypress-ntlm-auth proxy does not seem to be running. It must be started before cypress. Please see the docs.' + portsFile));
    }
  }
};

function validatePortsFile(ports) {
  if (!ports) {
    return false;
  }
  if (!ports.configApiUrl || !ports.ntlmProxyUrl) {
    return false;
  }
  let urlTest = url.parse(ports.configApiUrl);
  if (!urlTest.protocol || !urlTest.hostname || !urlTest.port) {
    return false;
  }
  urlTest = url.parse(ports.ntlmProxyUrl);
  if (!urlTest.protocol || !urlTest.hostname || !urlTest.port) {
    return false;
  }
  return true;
}
