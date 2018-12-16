'use strict';

//const fs = require("fs");
const log = require("debug")("cypress:ntlm");
//const cosmiconfig = require("cosmiconfig");
const proxy = require('./proxy');
//const explorer = cosmiconfig("cypress-ntlm-auth", { sync: true });
//const loaded = explorer.load();

/*
if (loaded && loaded.config && loaded.config.step_definitions) {
  return path.resolve(appRoot, loaded.config.step_definitions);
}
*/
module.exports = {
  setupNtlmAuth: function(config) {
    let proxyHost = 'localhost';
    let proxyPorts = proxy.startProxy(config.env.HTTP_PROXY, config.env.HTTPS_PROXY);
    let proxyUrl = 'http://' + proxyHost + ':' + proxyPorts.ntlmProxyPort;
    let configApiUrl = 'http://' + proxyHost + ':' + proxyPorts.configApiPort;

    /*
    config.env.CYPRESS_NTLM_AUTH_PROXY = proxyUrl;
    config.env.CYPRESS_NTLM_AUTH_API = configApiUrl;
*/
    return { proxyUrl: proxyUrl, configApiUrl: configApiUrl }; //config;
  },
  validateBrowser: function(browser = {}) {
    if (browser.name !== 'chrome') {
      log('NTLM auth plugin only validated with Chrome browser. Detected ' + browser.name + ', use at your own risk!');
    }
  }
}
/*
module.exports = (on, config) => {

  

  on('before:browser:launch', (browser = {}, args) => {
    console.log(browser, args) // see what all is in here!

    // browser will look something like this
    // {
    //   name: 'chrome',
    //   displayName: 'Chrome',
    //   version: '63.0.3239.108',
    //   path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    //   majorVersion: '63'
    // }

    // args are different based on the browser
    // sometimes an array, sometimes an object

    let proxyHost = 'localhost';
    let proxyPort = startProxy('example.ntlm.se');
    let proxyUrl = proxyHost + ':' + proxyPort;

    if (browser.name === 'chrome') {
      log('Configuring Chrome to use proxy at ' + proxyUrl);
      args.push('--proxy=localhost:' + proxyPort)
      return args
    } else {
      log('NTLM auth plugin only supports Chrome browser');
      return args
    }
  });
}
*/