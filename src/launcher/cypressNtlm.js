#!/usr/bin/env node

const portsFile = require('../util/portsFile');
const cypress = require('cypress/lib/cli');

if (portsFile.portsFileExists()) {
    portsFile.parsePortsFile((ports, err) => {
        if (err) {
            throw err;
        }

        process.env.HTTP_PROXY = ports.ntlmProxyUrl;
        cypress.init();
    });
}
