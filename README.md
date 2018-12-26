# cypress-ntlm-auth
NTLM authentication plugin for [Cypress](https://www.cypress.io/)

[![version](https://img.shields.io/npm/v/cypress-ntlm-auth.svg)](https://www.npmjs.com/package/cypress-ntlm-auth)
[![downloads](https://img.shields.io/npm/dt/cypress-ntlm-auth.svg)](https://www.npmjs.com/package/cypress-ntlm-auth)
[![MIT License](https://img.shields.io/github/license/bjowes/cypress-ntlm-auth.svg)](https://github.com/bjowes/cypress-ntlm-auth/blob/master/LICENSE)

[Changelog](https://github.com/bjowes/cypress-ntlm-auth/blob/master/CHANGELOG.md)

# Who needs this?
If you want to perfom end-to-end testing against deployed sites that require Windows Authentication, and you want to use [Cypress](https://www.cypress.io/), you will find that Cypress does not support NTLM (or Kerberos) authentication. Windows Authentication is quite widely used in corporate intranets. This plugin bridges the gap by providing NTLM authentication for Cypress in a streamlined manner.

## Never heard of Cypress? 
Read the intro at [their site](https://www.cypress.io/) and find out if it is the thing for you. (*spoiler - it is!*)

## Want to use NTLM authentication for something else? 
Parts of this library should be readily reusable, the ntlm-proxy is application agnostic and should be usable with Selenium or other solutions - you'll have to provide the streamlining into your application yourself though.

# Install

`npm install cypress-ntlm-auth`

# Configure

Follow these steps to configure Cypress to utilize this plugin:
1. Plugin
Modify the file `cypress/plugins/index.js` so it contains: 

```javascript
const ntlmAuth = require('cypress-ntlm-auth/src/plugin');
module.exports = (on, config) => {
  config = ntlmAuth.initNtlmAuth(config);
  return config;
}
```
(if you are using other plugins I trust you can merge this with your current file)

2. Commands
In the file `cypress/support/index.js` add this line

```javascript
import 'cypress-ntlm-auth/src/commands';
```

3.  package.json
Add this to the scripts section:

```json
    "ntlm-proxy": "ntlm-proxy &",
    "cypress-ntlm": "npm run ntlm-proxy && cypress-ntlm open"
```
Whatever other variants for starting Cypress you may need (headless for CI for instance) can easily be added in a similar manner, just replace 'open' with the arguments you need - they will all be passed on to Cypress.

# Startup
## npm run
When the additions to package.json are done as described above, the most convenient way to start Cypress with NTLM authentication is
```shell
npm run cypress-ntlm
```

## ntlm-proxy
This binary is available in the `node_modules/.bin` folder. Use it to start the ntlm-proxy manually.
### Example
```shell
# Start NTLM proxy 
$(npm bin)/ntlm-proxy

# Start NTLM proxy as a background process
$(npm bin)/ntlm-proxy &

# Start NTLM proxy with debug logging to console
DEBUG=* $(npm bin)/ntlm-proxy
```
## cypress-ntlm
This binary is available in the `node_modules/.bin` folder. Use it to start Cypress with NTLM authentication configured. This command will fail if the proxy isn't already running.

### Example
```shell
# Start Cypress with NTLM authentication
$(npm bin)/cypress-ntlm
```

# Usage
## cy.ntlm(ntlmHost, username, password, domain, [workstation])
The ntlm command is used to configure host/user mappings. After this command, all network communication from cypress to the specified host will be initiated with a NTLM login handshake with the specified user. This includes calls to `cy.visit(host)`, `cy.request(host)` and indirect network communication (when the browser fetches additional resources after the `cy.visit(host)` call).

### Syntax
```javascript
cy.ntlm(ntlmHost, username, password, domain, [workstation]);
```
* ntlmHost: protocol, hostname (and port if required) of the server where NTLM authentication shall be applied. This must NOT include the rest of the url (path and query). Examples: 
`http://localhost:4200`, `https://service.windowsserver.intranet.company.com`

* username: the username for the account to authenticate with
* password: the password for the account to authenticate with (see [Seurity advice](#Security-advice) regarding entering passwords)
* domain: the domain for the account to authenticate with (for AD account authentication) 
* workstation: the workstation for the account to authenticate with (for local machine account authentication)

The arguments domain and workstation are mutually exclusive. For AD account authentication, set the domain argument but don't set the workstation argument (null or empty string are accepted). For local machine account authentication, set the workstation argument but don't set the domain argument (null or empty string are accepted). If both arguments are set, this command will return an error.

The ntlm command may be called multiple times to setup multiple ntlmHosts, also with different credentials. If the ntlm command is called with the same ntlmHost again, it overwrites the credentials for that ntlmHost.

Configuration set with the ntlm command persists until it is reset (see ntlmReset command) or when the proxy is terminated. Take note that it *is not cleared when the current specfile is finished*.

### Example
You want to test a IIS website on your intranet `https://zappa.intranet.acme.com` that requires Windows Authentication and allows NTLM. The test user is `acme\bobby` (meaning domain `acme` and username `bobby`), and the password is `brown`.
```javascript
cy.ntlm('https://zappa.intranet.acme.com', 'bobby', 'brown', 'acme');
// Access the zappa site with user bobby
cy.visit('https://zappa.intranet.acme.com');
// Test actions and asserts here

cy.ntlm('https://zappa.intranet.acme.com', 'admin', 'secret', 'acme');
// Access the zappa site with user admin
cy.visit('https://zappa.intranet.acme.com');
// Test actions and asserts here
```

#### <a name="Security-advice"></a> Security advice
Hard coding password into your test specs isn't a great idea, even though it may seem harmless. Test code will end up in a repository, which makes the full credentials for the accounts used in your tests searchable in the repo. Even if the repo is on an internal company hosted server, this is not good practice. The recommended way to handle credentials is to use config files / environment variables, and to have these populated by your release pipeline. Cypress has several options to [provide custom configuration for different environments](https://docs.cypress.io/guides/guides/environment-variables.html#Setting) - pick one that makes sense in your pipeline. 

You can then combine this with setting up multiple accounts to test your application using different levels of access (if needed by your application). Using this technique, you should end up with something like this:
```javascript
// Readonly user access
cy.ntlm('https://zappa.intranet.acme.com', 
    Cypress.env.ZAPPA_READONLY_USERNAME,
    Cypress.env.ZAPPA_READONLY_PASSWORD,
    Cypress.env.ZAPPA_READONLY_DOMAIN);
// tests ...

// Admin user access
cy.ntlm('https://zappa.intranet.acme.com', 
    Cypress.env.ZAPPA_ADMIN_USERNAME,
    Cypress.env.ZAPPA_ADMIN_PASSWORD,
    Cypress.env.ZAPPA_ADMIN_DOMAIN);
// tests ...
```

#### Pro-tip: baseUrl
If you are testing a single site, it is convenient to set the [baseUrl](https://docs.cypress.io/guides/references/best-practices.html#Setting-a-global-baseUrl) parameter in Cypress to the hostname, so you don't have to provide it on every call to `cy.visit()` or `cy.request()`. Set it in `cypress.json` or simply use:
```javascript
Cypress.env.baseUrl = ntlmHost;
```
This will persist until the current specfile is finished.

## cy.ntlmReset()
The ntlmReset command is used to remove all configured ntlmHosts from previous ntlm command calls. Since the proxy configuration persists when a test case or spec file is finished, a good practice is to call ntlmReset in the beforeEach method. This ensures that you have a clean setup at the start of each test.

### Syntax
```javascript
cy.ntlmReset();
```

### Example
Using ntlmReset to clear configuration.
```javascript
cy.ntlm('https://zappa.intranet.acme.com', 'bobby', 'brown', 'acme');
cy.visit('https://zappa.intranet.acme.com'); // This succeeds
cy.ntlmReset();
cy.visit('https://zappa.intranet.acme.com'); // This fails (401)
```

# Notes
## ntlm-proxy process
Since the ntlm-proxy process is intended to be used only by Cypress, it is terminated when Cypress exits. If for some reason you want to keep the ntlm-proxy process running independently of Cypress, please set the environment variable:
```shell
CYPRESS_NTLM_AUTH_SHUTDOWN_WITH_CYPRESS=false
```
## .http-mitm-proxy
The http-mitm-proxy library will create a .http-mitm-proxy folder with generated certificates. This improves performance when re-running tests using the same sites. It is recommended to add this folder to your .gitignore so the certificates don't end up in your repo.

## https on localhost
The NTLM proxy will accept self-signed certificates for sites that are served from localhost. This is convenient for testing local development builds withouth requiring a full CA chain for the certificates, while still requiring proper certificates from external servers. 

# Planned work
* More real-world testing against Windows servers
* Upstream proxy support
* Support custom http.Agent / https.Agent configuration
* Configuration option to disable self-signed certificates even for localhost

# Credits
* [http-mitm-proxy](https://github.com/joeferner/node-http-mitm-proxy) - this proxy is used to intercept the traffic and inject the NTLM handshake. I chose this one because it includes full https support with certificate generation.
* [httpntlm](https://github.com/SamDecrock/node-http-ntlm) - the NTLM methods from this library is used to generate and parse the NTLM messages.
* [express-ntlm](https://github.com/einfallstoll/express-ntlm) - simplified local testing of cypress-ntlm-auth, since no real Windows server was required.