#!/usr/bin/env node

'use strict';

const proxyServer = require('./server');
const nodeCleanup = require('node-cleanup');
const debug = require('debug')('cypress:plugin:ntlm-auth');

proxyServer.startProxy(process.env.HTTP_PROXY, process.env.HTTPS_PROXY, true,
  (ports, err) => {
    if (err) {
      debug('Could not start ntlm-proxy');
      throw err;
    }
    debug('Startup done!');
    debug(ports);
  });

// Unfortunately we can only catch these signals on Mac/Linux,
// Windows gets a hard exit => the portsFile is left behind,
// but will be replaced on next start
nodeCleanup((exitCode, signal) => {
  if (exitCode) {
    debug('Detected process exit with code', exitCode);
    proxyServer.shutDown(false, false);
  }
  if (signal) {
    debug('Detected termination signal', signal);
    proxyServer.shutDown(false, true);
  }
});
