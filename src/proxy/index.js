#!/usr/bin/env node

'use strict';

const proxyServer = require('./server');
const debug = require('debug')('cypress:ntlm-auth-plugin');

(async () => {
  let ports = await proxyServer.startProxy(process.env.HTTP_PROXY, process.env.HTTPS_PROXY, (ports, err) => {
    debug('Startup done!');
    debug(ports);
  });
})();
