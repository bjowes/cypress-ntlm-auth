<!-- markdownlint-disable MD024 -->
<!-- markdownlint-disable MD033 -->

# cypress-ntlm-auth

NTLM authentication plugin for [Cypress](https://www.cypress.io/)

If you want to perform end-to-end testing against deployed sites that require Windows Authentication, and you want to use [Cypress](https://www.cypress.io/), you will find that Cypress does not support Windows Authentication. Windows Authentication is quite widely used in corporate intranets. This plugin bridges the gap by providing NTLM authentication (and Negotiate when using SSO) for Cypress in a streamlined manner.

[![version](https://img.shields.io/npm/v/cypress-ntlm-auth.svg)](https://www.npmjs.com/package/cypress-ntlm-auth)
[![downloads](https://img.shields.io/npm/dt/cypress-ntlm-auth.svg)](https://www.npmjs.com/package/cypress-ntlm-auth)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/bjowes/cypress-ntlm-auth.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/bjowes/cypress-ntlm-auth/context:javascript)
[![MIT License](https://img.shields.io/github/license/bjowes/cypress-ntlm-auth.svg)](https://github.com/bjowes/cypress-ntlm-auth/blob/master/LICENSE)

[Changelog](https://github.com/bjowes/cypress-ntlm-auth/blob/master/CHANGELOG.md)

_Never heard of Cypress?_

Read the intro at [their site](https://www.cypress.io/) and find out if it is the thing for you. (_spoiler - it is!_)

_Want to use NTLM or Negotiate authentication for something else?_

Parts of this library should be readily reusable, the ntlm-proxy is application agnostic and should be usable with Selenium or other solutions - you'll have to provide the streamlining into your application yourself though.

## _BREAKING CHANGE_ from release 2.0.0

Not really a breaking change, but if your test client runs on Windows you should consider using the new single sign on feature instead of the old way to configure hosts. It offers fully featured NTLM authentication and Negotiate authentication with all the security features provided natively by Windows. Secondly, the configuration is much simpler since you only need to specify hosts, no credentials. User credentials from the user running the test client are used automatically.

Check out the new `cy.ntlmSso` command below and give it a try!

## Install

```shell
npm install --save-dev cypress-ntlm-auth
```

The `--save-dev` flag stores cypress-ntlm-auth as a development dependency, which is suitable for a testing utility.

## Configure

Follow these steps to configure Cypress to utilize this plugin:

### 1. Plugin

Modify the file `cypress/plugins/index.js` so it contains:

```javascript
const ntlmAuth = require("cypress-ntlm-auth/dist/plugin");
module.exports = (on, config) => {
  config = ntlmAuth.initNtlmAuth(config);
  return config;
};
```

(if you are using other plugins I trust you can merge this with your current file)

Note that once this code is in place, cypress must be started using the cypress-ntlm launcher.
If cypress is started without the launcher, the plugin will throw an error. To be able to run
cypress without the launcher, the plugin must be disabled (commenting out the call to `initNtlmAuth` is sufficient).

### 2. Commands

In the file `cypress/support/index.js` add this line

```javascript
import "cypress-ntlm-auth/dist/commands";
```

### 3. package.json

Add this to the scripts section:

#### Mac and Linux

```json
    "ntlm-proxy": "ntlm-proxy &",
    "cypress-ntlm": "npm run ntlm-proxy && (cypress-ntlm open ; ntlm-proxy-exit)"
```

#### Windows

```json
    "ntlm-proxy": "start /min \"ntlm-proxy\" cmd /c node_modules\\.bin\\ntlm-proxy",
    "cypress-ntlm": "npm run ntlm-proxy && (cypress-ntlm open & ntlm-proxy-exit)"
```

Whatever other variants for starting Cypress you may need (headless for CI for instance) can easily be added in a similar manner. Just replace 'open' with the arguments you need - any arguments that follow cypress-ntlm will be passed on to Cypress.

## Startup

### npm run cypress-ntlm

When the additions to package.json are done as described above, the most convenient way to start Cypress with NTLM authentication is

```shell
npm run cypress-ntlm
```

This starts the ntlm-proxy as a separate process and runs cypress in headed mode (`cypress open`). After Cypress exits, the ntlm-proxy process is terminated.

### ntlm-proxy

This binary is available in the `node_modules/.bin` folder. Use it to start the ntlm-proxy manually.

#### Example - Mac and Linux

```shell
# Start NTLM proxy
$(npm bin)/ntlm-proxy

# Start NTLM proxy as a background process
$(npm bin)/ntlm-proxy &

# Start NTLM proxy with debug logging to console
DEBUG=cypress:plugin:ntlm-auth $(npm bin)/ntlm-proxy
```

#### Example - Windows

```shell
# Start NTLM proxy
node_modules\\.bin\\ntlm-proxy

# Start NTLM proxy as a background process, close window when ntlm-proxy terminates
start /min \"ntlm-proxy\" cmd /c node_modules\\.bin\\ntlm-proxy

# Start NTLM proxy with debug logging to console
set DEBUG=cypress:plugin:ntlm-auth
node_modules\\.bin\\ntlm-proxy
```

### ntlm-proxy-exit

This binary is available in the `node_modules/.bin` folder. Use it to send an exit command to a ntlm-proxy running in the background.

#### Example - Mac and Linux

```shell
# Terminate NTLM proxy
$(npm bin)/ntlm-proxy-exit

# Stop NTLM proxy with debug logging to console
DEBUG=cypress:plugin:ntlm-auth $(npm bin)/ntlm-proxy-exit
```

#### Example - Windows

```shell
# Terminate NTLM proxy
node_modules\\.bin\\ntlm-proxy-exit

# Stop NTLM proxy with debug logging to console
set DEBUG=cypress:plugin:ntlm-auth
node_modules\\.bin\\ntlm-proxy-exit
```

### cypress-ntlm

This binary is available in the `node_modules/.bin` folder. Use it to start Cypress with NTLM authentication configured. This command expects the ntlm-proxy to be running. If it isn't, cypress-ntlm will wait up to 5 seconds for ntlm-proxy to start. If ntlm-proxy still hasn't started, the cypress-ntlm command will fail.

If an older instance of ntlm-proxy is still running, cypress-ntlm will pause for a few seconds to allow it to terminate before polling for the new instance.

It will also validate that cypress is installed.

#### Example - Mac and Linux

```shell
# Start Cypress with NTLM authentication
$(npm bin)/cypress-ntlm
```

#### Example - Windows

```shell
# Start Cypress with NTLM authentication
node_modules\\.bin\\cypress-ntlm
```

## Upstream proxy

If your network environment enforces proxy usage for internet access (quite likely given that you are using NTLM) and the host you are testing uses resources on the internet (e.g. loading bootstrap or jQuery from a CDN), you need to make the ntlm-proxy aware of the internet proxy. This is done by setting the (standardized) environment variables below before starting the ntlm-proxy (with either the `ntlm-proxy` binary or the `cypress-ntlm` binary):

- `HTTP_PROXY` - The URL to the proxy for accessing external HTTP/HTTPS resources. Example: `http://proxy.acme.com:8080`
- `HTTPS_PROXY` - The URL to the proxy for accessing external HTTPS resources. Overrides `HTTP_PROXY` for HTTPS resources. Example: `http://proxy.acme.com:8080`
- `NO_PROXY` - A comma separated list of internal hosts to exclude from proxying. Normally you want to include `localhost` and the host you are testing, and likely other local network resources used from the browser when accessing the host you are testing. Include only the hostname (or IP), not the protocol or port. Wildcards are supported. Example: localhost,\*.acme.com

If the host you are testing is located on the internet (not your intranet) the NTLM authentication is able to pass through also the internet proxy. In this case `NO_PROXY` only needs to include `localhost`.

## Usage

### cy.ntlm(ntlmHost, username, password, [domain, [workstation]])

The ntlm command is used to configure host/user mappings. After this command, all network communication from cypress to the specified host is monitored by the ntlm-proxy. If the server sends an authentication challenge, the ntlm-proxy will perform a NTLM login handshake with the configured user.
Note that "all network communication" includes calls to `cy.visit(host)`, `cy.request(host)` and indirect network communication (when the browser fetches additional resources after the `cy.visit(host)` call).

If domain and workstation are not set, the ntlm-proxy will use the domain of the ntlmHost.

#### Syntax

```javascript
cy.ntlm(ntlmHost, username, password, [domain, [workstation, [ntlmVersion]]]);
```

- ntlmHost: protocol, hostname (and port if required) of the server where NTLM authentication shall be applied. This must NOT include the rest of the url (path and query) - only host level authentication is supported. Examples: `http://localhost:4200`, `https://ntlm.acme.com`
- username: the username for the account to authenticate with
- password: the password for the account to authenticate with (see [Security advice](#Security-advice) regarding entering passwords)
- domain (optional): the domain for the account to authenticate with (for AD account authentication). Default value: the domain of the ntlmHost.
- workstation (optional): the workstation name of the client. Default value: `os.hostname()`;
- ntlmVersion (optional): the version of the NTLM protocol to use. Valid values are 1 and 2. Default value: 2. This can be useful for legacy hosts that don't support NTLMv2, or for certain scenarios where the NTLMv2 handshake fails (the plugin does not implement all features of NTLMv2 yet).

The ntlm command may be called multiple times to setup multiple ntlmHosts, also with different credentials. If the ntlm command is called with the same ntlmHost again, it overwrites the credentials for that ntlmHost. Existing connections are not terminated, but if the server requests reauthentication the new credentials will be used.

Configuration set with the ntlm command persists until it is reset (see ntlmReset command) or when the proxy is terminated. Take note that it _is not cleared when the current spec file is finished_.

#### Example

You want to test a IIS website on your intranet `https://ntlm.acme.com` that requires Windows Authentication and allows NTLM. The test user is `acme\bobby` (meaning domain `acme` and username `bobby`), and the password is `brown`.

```javascript
cy.ntlm("https://ntlm.acme.com", "bobby", "brown", "acme");
// Access the ntlm site with user bobby
cy.visit("https://ntlm.acme.com");
// Test actions and asserts here

cy.ntlm("https://ntlm.acme.com", "admin", "secret", "acme");
// Access the ntlm site with user admin
cy.visit("https://ntlm.acme.com");
// Test actions and asserts here

cy.ntlm(
  "https://ntlm-legacy.acme.com",
  "admin",
  "secret",
  "acme",
  undefined,
  1
);
// Access the ntlm-legacy site with user admin using NTLMv1
cy.visit("https://ntlm-legacy.acme.com");
// Test actions and asserts here
```

#### <a name="Security-advice"></a> Security advice

Hard coding password into your test specs isn't a great idea, even though it may seem harmless. Test code will end up in a repository, which makes the full credentials for the accounts used in your tests searchable in the repository. Even if the repository is on an internal company hosted server, this is not good practice. The recommended way to handle credentials is to use config files / environment variables, and to have these populated by your release pipeline. Cypress has several options to [provide custom configuration for different environments](https://docs.cypress.io/guides/guides/environment-variables.html#Setting) - pick one that makes sense in your pipeline.

You can then combine this with setting up multiple accounts to test your application using different levels of access (if needed by your application). Using this technique, you should end up with something like this:

```javascript
// Read-only user access
cy.ntlm(
  "https://ntlm.acme.com",
  Cypress.env.NTLM_READONLY_USERNAME,
  Cypress.env.NTLM_READONLY_PASSWORD,
  Cypress.env.NTLM_READONLY_DOMAIN
);
// tests ...

// Admin user access
cy.ntlm(
  "https://ntlm.intranet.acme.com",
  Cypress.env.NTLM_ADMIN_USERNAME,
  Cypress.env.NTLM_ADMIN_PASSWORD,
  Cypress.env.NTLM_ADMIN_DOMAIN
);
// tests ...
```

#### Pro-tip: baseUrl

If you are testing a single site, it is convenient to set the [baseUrl](https://docs.cypress.io/guides/references/best-practices.html#Setting-a-global-baseUrl) parameter in Cypress to the hostname, so you don't have to provide it on every call to `cy.visit()` or `cy.request()`. Set it in `cypress.json` or simply use:

```javascript
Cypress.env.baseUrl = ntlmHost;
```

This will persist until the current spec file is finished.

### cy.ntlmSso(ntlmHosts)

The ntlmSso command is used to configure host for single sign on authentication. After this command, all network communication from cypress to the specified hosts is monitored by the ntlm-proxy. If the server sends an authentication challenge, the ntlm-proxy will perform a NTLM or Negotiate login handshake with the credentials of the user running the test client.
Note that "all network communication" includes calls to `cy.visit(host)`, `cy.request(host)` and indirect network communication (when the browser fetches additional resources after the `cy.visit(host)` call).

#### Syntax

```javascript
cy.ntlmSso(ntlmHosts);
```

- ntlmHosts: array of FQDNs or hostnames of the servers where NTLM or Negotiate authentication with single sign on shall be applied. The hosts must NOT include protocol, port or the rest of the url (path and query) - only host level authentication is supported. In addition, wildcards are allowed to simplify specifying SSO for a whole intranet. Example: `['localhost', '*.acme.com']`

The ntlmSso command may be called multiple times, each call will overwrite the previous ntlmSso configuration.

The NTLM protocol version cannot be specified, it is negotiated automatically. The client will follow the settings in Windows (LMCompatibilityLevel), which could mean that a legacy host with NTLMv1 only cannot be accessed if the client settings don't allow NTLMv1.

Configuration set with the ntlmSso command persists until it is reset (see ntlmReset command) or when the proxy is terminated. Take note that it _is not cleared when the current spec file is finished_.

#### Example

You want to test a IIS website on your intranet `https://ntlm.acme.com` that requires Windows Authentication and allows NTLM.

```javascript
// Enable single sign on all hosts within *.acme.com
cy.ntlmSso(["*.acme.com"]);
// Access the ntlm site with the user running the test client
cy.visit("https://ntlm.acme.com");
// Test actions and asserts here

// Enable single sign on for both ntlm.acme-legacy.com and all hosts within *.acme.com
cy.ntlmSso(["ntlm.acme-legacy.com", "*.acme.com"]);
// Access the legacy site with the user running the test client
cy.visit("https://ntlm.acme-legacy.com");
// Test actions and asserts here
```

### cy.ntlmReset()

The ntlmReset command is used to remove all configured ntlmHosts from previous ntlm command calls. Since the proxy configuration persists even when a test case or spec file is finished, a good practice is to call ntlmReset in the beforeEach method. This ensures that you have a clean setup at the start of each test.

#### Syntax

```javascript
cy.ntlmReset();
```

#### Example

Using ntlmReset to clear configuration.

```javascript
cy.ntlm("https://ntlm.acme.com", "bobby", "brown", "acme");
cy.visit("https://ntlm.acme.com"); // This succeeds
cy.ntlmReset();
cy.visit("https://ntlm.acme.com"); // This fails (401)
```

## Debugging

When reporting issues with this plugin, please collect debug logs for your scenario as described below and add them to the issue.

### Running ntlm-proxy independently

If the recommended startup scripts from above are used, the ntlm-proxy will be terminated when the cypress tests are finished. For troubleshooting it is often easier if the ntlm-proxy is running independently so the debug logs can be read or copied also after the cypress tests are finished. To run ntlm-proxy independently with debugging, follow these steps:

#### Mac or Linux

1. Open a terminal and go to your project root directory.
2. `DEBUG=cypress:plugin:ntlm-auth node_modules/.bin/ntlm-proxy`
3. Open another terminal and go to your project root directory
4. `node_modules/.bin/cypress-ntlm open`
5. Run your cypress tests and view the logs in the first terminal.

#### Windows

1. Open a cmd window and go to your project root directory.
2. `set DEBUG=cypress:plugin:ntlm-auth`
3. `node_modules\.bin\ntlm-proxy`
4. Open another cmd window and go to your project root directory
5. `node_modules\.bin\cypress-ntlm open`
6. Run your cypress tests and view the logs in the first cmd window.

### Debug logging of NTLM and Negotiate headers

To write also the NTLM and Negotiate headers sent and received by ntlm-proxy, set the environment variable `DEBUG_NTLM_HEADERS=1`. If you use this, take some care with the logs since access to the NTLM and Negotiate headers are an attack vector for the account, especially if you are using NTLMv1.

## Node module API

This plugin can also be called as a Node module. It mimics the behavior of the [run method in Cypress module API](https://docs.cypress.io/guides/guides/module-api.html#cypress-run) - accepting the same arguments, passing them on to Cypress and returning the same value. It will automatically start the ntlm-proxy before calling `cypress.run()`, and it will shut down the ntlm-proxy after the tests have finished.

### Example

```javascript
const cypressNtlmAuth = require("cypress-ntlm-auth");
cypressNtlmAuth
  .run({
    spec: "./cypress/integration/test.spec.js"
  })
  .then(result => console.log(result))
  .catch(err => console.log(err));
```

## Notes

### ntlm-proxy process

The ntlm-proxy process is intended to be used only by Cypress, and should be terminated after Cypress exits. This requires that the ntlm-proxy-exit launcher is executed, as in the examples above. Otherwise it will stay in the background indefinitely (or until a new ntlm-proxy is started).

In versions 0.4.0 and earlier, the proxy was terminated automatically on signals when Cypress exited. However, this approach has no support on Windows (no decent signal handling) - hence it was removed for consistent behavior across platforms.

### .http-mitm-proxy

The http-mitm-proxy library will create a .http-mitm-proxy folder with generated certificates. This improves performance when re-running tests using the same sites. It is recommended to add this folder to your .gitignore so the certificates don't end up in your repo.

### https on localhost

The NTLM proxy will accept self-signed certificates for sites that are served from localhost. This is convenient for testing local development builds without requiring a full CA chain for the certificates, while still requiring proper certificates from external servers.

### HTTPS/SSL/TLS issues

Getting certificates right can be a burden. When accessing a HTTPS site, the site certificate is validated by ntlm-proxy (just like web browsers do). If the validation fails, the proxy will return an error code (504).

#### Corporate CA certificates

Many corporate intranets utilize SSL inspection, which means that your HTTPS traffic is decrypted, inspected, and then encrypted with an internal corporate certificate. Since Node doesn't trust the corporate certificates CA, it will raise an error. Download the certificate to your machine and set the environment variable `NODE_EXTRA_CA_CERTS` to the full path to the certificate file. This will make Node trust it as a CA.

#### Disable TLS validation

If you are unable to resolve the certificate issues you can use the standard Node workaround by setting the environment variable `NODE_TLS_REJECT_UNAUTHORIZED=0` before starting ntlm-proxy. If you are running Node 11 or later, you will (rightfully) get a warning when doing this, since disabling the certificate validation makes your machine more vulnerable to MITM attacks. When used only in a development environment and only for testing an internal site, the risk is significantly reduced - but I would still strongly recommend resolving the certificate issues instead of relying on the workaround.

## Build instructions

### Transpile

The plugin has been rewritten in TypeScript (release 1.0.0) and the git repository does not include the transpiled files. Hence, if you need to build the plugin from source:

```script
npm run build
```

This transpiles the sources into the `dist` folder, copies additional files to `dist` and sets permissions for the launchers.

### Test

To run the unit test suite:

```script
npm test
```

## Credits

- [http-mitm-proxy](https://github.com/joeferner/node-http-mitm-proxy) - this proxy is used to intercept the traffic and inject the NTLM handshake. I chose this one because it includes full https support with certificate generation.
- [ntlm-client](https://github.com/clncln1/node-ntlm-client) - Strong inspiration for the NTLM methods in this library.
- [ntlm-auth](https://github.com/jborean93/ntlm-auth) - Python library for NTLM authentication. Used as a reference implementation to generate NTLM headers for unit tests.
- [express-ntlm](https://github.com/einfallstoll/express-ntlm) - simplified local testing of cypress-ntlm-auth, since no real Windows server was required.
- [Travis-CI](https://travis-ci.com/) - makes automated testing of multiple platforms and multiple node versions so much easier.
