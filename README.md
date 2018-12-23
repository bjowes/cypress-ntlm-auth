# cypress-ntlm-auth
NTLM authentication plugin for Cypress

This software is still in alpha condition. More info will be added when it is ready for a wider audience.

# Install

`npm install cypress-ntlm-auth`

# Configure

## plugin
Modify the file `cypress/plugins/index.js` so it contains: (if you are using other plugins I trust you can merge this with your current file)
```
const ntlmAuth = require('cypress-ntlm-auth/src/plugin');
module.exports = (on, config) => {
  config = ntlmAuth.initNtlmAuth(config);
  return config;
}
```

## commands
In the file `cypress/support/index.js` add this line
`import 'cypress-ntlm-auth/src/commands';`

## package.json
Add this to the scripts section:
```
    "ntlm-proxy": "ntlm-proxy &",
    "cypress-ntlm": "npm run ntlm-proxy && cypress-ntlm open"
```

# Startup

# Usage
cy.ntlm()
cy.ntlmReset()

# Notes
The http-mitm-proxy library will create a .http-mitm-proxy folder with generated certificates. I recommend adding this folder to your .gitignore so they don't end up in your repo.

# Credits
* [http-mitm-proxy](https://github.com/joeferner/node-http-mitm-proxy)
* [httpntlm](https://github.com/SamDecrock/node-http-ntlm)