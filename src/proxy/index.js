#!/usr/bin/env node

'use strict';

const proxyServer = require('./server');
const debug = require('debug')('cypress:ntlm-auth-plugin');

proxyServer.startProxy(process.env.HTTP_PROXY, process.env.HTTPS_PROXY, true, (ports, err) => {
  if (err) {
    debug('Could not start ntlm-proxy');
    throw err;
  }
  debug('Startup done!');
  debug(ports);
});
