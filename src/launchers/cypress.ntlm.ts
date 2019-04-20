#!/usr/bin/env node

import { DependencyInjection } from '../proxy/dependency.injection';
import { TYPES } from '../proxy/dependency.injection.types';
import { IPortsFileService } from '../util/interfaces/i.ports.file.service';

const container = new DependencyInjection();
let portsFileService = container.get<IPortsFileService>(TYPES.IPortsFileService);

if (portsFileService.exists()) {
  const portsFile = portsFileService.parse();
  process.env.HTTP_PROXY = portsFile.ntlmProxyUrl;
  process.env.HTTPS_PROXY = portsFile.ntlmProxyUrl;
  process.env.NO_PROXY = '';

  // Start up Cypress and let it parse any command line arguments
  require('cypress/lib/cli').init();
} else {
  throw new Error('ntlm-proxy must be started before this command');
}
