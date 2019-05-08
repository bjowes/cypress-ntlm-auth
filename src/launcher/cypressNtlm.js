#!/usr/bin/env node

'use strict';

const portsFile = require('../util/portsFile');
const cypress = require('cypress/lib/cli');

checkPortsFileExists(5000, 200)
.then(() => {
  portsFile.parse((ports, err) => {
    if (err) {
      throw err;
    }

    process.env.HTTP_PROXY = ports.ntlmProxyUrl;
    process.env.HTTPS_PROXY = ports.ntlmProxyUrl;
    process.env.NO_PROXY = '';
    cypress.init();
  });
})
.catch(() => {
  process.stderr.write('ERROR: ntlm-proxy must be started before this command\n');
  process.exit(1);
});

function checkPortsFileExists(timeout, interval) {
  return new Promise((resolve, reject) => {
    const timeoutTimerId = setTimeout(handleTimeout, timeout);
    let intervalTimerId;

    function handleTimeout() {
      clearTimeout(intervalTimerId);
      const error = new Error('Ports file not found before timeout');
      error.name = 'PATH_CHECK_TIMED_OUT';
      reject(error);
    }

    function handleInterval() {
      if (portsFile.exists()) {
        clearTimeout(timeoutTimerId);
        resolve(true);
      } else {
        intervalTimerId = setTimeout(handleInterval, interval);
      }
    }

    handleInterval();
  });
}
