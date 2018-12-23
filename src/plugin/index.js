'use strict';

const log = require("debug")("cypress:ntlm-auth-plugin");
const portsFile = require('../util/portsFile');

module.exports = {
  initNtlmAuth: function(config) {
    return new Promise((resolve, reject) => {
      portsFile.parsePortsFile((ports, err) => {
        if (err) {
          reject(err);
        }
        config.env.CYPRESS_NTLM_AUTH_PROXY = ports.ntlmProxyUrl;
        config.env.CYPRESS_NTLM_AUTH_API = ports.configApiUrl;
        resolve(config);  
      });   
    });
  },
  validateBrowser: function(browser = {}) {
    if (browser.name !== 'chrome') {
      log('NTLM auth plugin only validated with Chrome browser. Detected ' + browser.name + ', use at your own risk!');
    }
  }
}
