#!/usr/bin/env node

import { DependencyInjection } from '../proxy/dependency.injection';
import { TYPES } from '../proxy/dependency.injection.types';
import { ICypressNtlm } from '../util/interfaces/i.cypress.ntlm';

const container = new DependencyInjection();
let cypressNtlm = container.get<ICypressNtlm>(TYPES.ICypressNtlm);

cypressNtlm.checkProxyIsRunning(5000, 200)
.then((portsFile) => {
  process.env.HTTP_PROXY = portsFile.ntlmProxyUrl;
  process.env.NO_PROXY = '';

  // Start up Cypress and let it parse any command line arguments
  require('cypress/lib/cli').init();
})
.catch(() => {
  process.stderr.write('ERROR: ntlm-proxy must be started before this command\n');
  process.exit(1);
});
