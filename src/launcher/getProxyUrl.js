'use strict';

const portsFile = require('../util/portsFile');

if (portsFile.portsFileExists()) {
    portsFile.parsePortsFile((ports, err) => {
        if (err) {
            throw err;
        }
        console.log(ports.ntlmProxyUrl);
    });
}
return null;
