#!/usr/bin/env node

'use strict';

const proxyServer = require('./server');
const nodeCleanup = require('node-cleanup');
const debug = require('debug')('cypress:ntlm-auth-plugin');

proxyServer.startProxy(process.env.HTTP_PROXY, process.env.HTTPS_PROXY, true,
  (ports, err) => {
    if (err) {
      debug('Could not start ntlm-proxy');
      throw err;
    }
    debug('Startup done!');
    debug(ports);
  });

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
