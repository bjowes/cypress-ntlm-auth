#!/usr/bin/env node

'use strict';

const portsFile = require('../util/portsFile');
const debug = require('debug')('cypress:plugin:ntlm-auth');
const url = require('url');
const http = require('http');

function sendQuitCommand(configApi) {
  let configApiUrl = url.parse(configApi);
  debug('ntlm-proxy-exit: Sending shutdown command to NTLM proxy');
  let quitBody = JSON.stringify({ keepPortsFile: false });

  let quitReq = http.request({
    method: 'POST',
    path: '/quit',
    host: configApiUrl.hostname,
    port: configApiUrl.port,
    timeout: 5000,
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(quitBody)
    }
  }, function (res) {
    res.resume();
    if (res.statusCode !== 200) {
      debug('ntlm-proxy-exit: Unexpected response from NTLM proxy: ' + res.statusCode);
      throw new Error('Unexpected response from NTLM proxy: ' + res.statusCode);
    }
    debug('ntlm-proxy-exit: Shutdown successful');
  });
  quitReq.on('error', (err) => {
    debug('ntlm-proxy-exit: Shutdown request failed: ' + err);
    throw new Error('Shutdown request failed: ' + err);
  });
  quitReq.write(quitBody);
  quitReq.end();
}

if (portsFile.exists()) {
  portsFile.parse((ports, err) => {
    if (err) {
      throw err;
    }
    sendQuitCommand(ports.configApiUrl);
  });
} else {
  debug('ntlm-proxy-exit: ntlm-proxy is not running, nothing to do.');
}
