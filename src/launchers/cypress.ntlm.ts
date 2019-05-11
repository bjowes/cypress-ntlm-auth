#!/usr/bin/env node

// reflect-metadata is required since PortsFileService has decorator injectable
import 'reflect-metadata';

import { PortsFileService } from '../util/ports.file.service';

let portsFileService = new PortsFileService();

checkPortsFileExists(5000, 200)
.then(() => {
  const portsFile = portsFileService.parse();
  process.env.HTTP_PROXY = portsFile.ntlmProxyUrl;
  process.env.HTTPS_PROXY = portsFile.ntlmProxyUrl;
  process.env.NO_PROXY = '';

  // Start up Cypress and let it parse any command line arguments
  require('cypress/lib/cli').init();
})
.catch(() => {
  process.stderr.write('ERROR: ntlm-proxy must be started before this command\n');
  process.exit(1);
});

function checkPortsFileExists(timeout: number, interval: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const timeoutTimerId = setTimeout(handleTimeout, timeout);
    let intervalTimerId: NodeJS.Timeout;

    function handleTimeout() {
      clearTimeout(intervalTimerId);
      const error = new Error('Ports file not found before timed out');
      error.name = 'PATH_CHECK_TIMED_OUT';
      reject(error);
    }

    function handleInterval() {
      if (portsFileService.exists()) {
        clearTimeout(timeoutTimerId);
        resolve(true);
      } else {
        intervalTimerId = setTimeout(handleInterval, interval);
      }
    }

    handleInterval();
  });
}
