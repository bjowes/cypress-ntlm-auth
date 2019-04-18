#!/usr/bin/env node

'use strict';

const DependencyInjection = require('../../dist/proxy/dependency.injection').DependencyInjection;
const DependencyInjectionTypes = require('../../dist/proxy/dependency.injection.types').TYPES;

const container = new DependencyInjection();
let ntlmProxyExit = container.get(DependencyInjectionTypes.INtlmProxyExit);

(async () => {
  await ntlmProxyExit.quitIfRunning();
})();
