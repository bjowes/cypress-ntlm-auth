#!/usr/bin/env node

'use strict';

const DependencyInjection = require('../../dist/proxy/dependency.injection').DependencyInjection;
const DependencyInjectionTypes = require('../../dist/proxy/dependency.injection.types').TYPES;
const nodeCleanup = require('node-cleanup');

const container = new DependencyInjection();
let proxyMain = container.get(DependencyInjectionTypes.IMain);
let debug = container.get(DependencyInjectionTypes.IDebugLogger);

(async () => {
  await proxyMain.run(
    false,
    process.env.HTTP_PROXY,
    process.env.HTTPS_PROXY,
    process.env.NO_PROXY);
})();

// Unfortunately we can only catch these signals on Mac/Linux,
// Windows gets a hard exit => the portsFile is left behind,
// but will be replaced on next start
nodeCleanup(async (exitCode, signal) => {
  if (exitCode) {
    debug.log('Detected process exit with code', exitCode);
  }
  if (signal) {
    debug.log('Detected termination signal', signal);
  }
  await proxyMain.stop();
});
