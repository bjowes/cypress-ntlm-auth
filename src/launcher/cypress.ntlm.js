#!/usr/bin/env node

'use strict';

const DependencyInjection = require('../../dist/proxy/dependency.injection').DependencyInjection;
const DependencyInjectionTypes = require('../../dist/proxy/dependency.injection.types').TYPES;
const cypress = require('cypress/lib/cli');

const container = new DependencyInjection();
let portsFileService = container.get(DependencyInjectionTypes.IPortsFileService);

if (portsFileService.exists()) {
  const portsFile = portsFileService.parse();
  process.env.HTTP_PROXY = portsFile.ntlmProxyUrl;
  process.env.HTTPS_PROXY = portsFile.ntlmProxyUrl;
  process.env.NO_PROXY = '';
  cypress.init();
} else {
  throw new Error('ntlm-proxy must be started before this command');
}
