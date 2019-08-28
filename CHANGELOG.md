# Changelog

## 1.3.2 - released 2019-08-28

* Fix #58: Refactored NTLM library to typescript
* Fix #71: Reuse actual NTLM type 1 message when calculating MIC
* Package bump

## 1.3.1 - released 2019-08-02

* Package bump due to security issue

## 1.3.0 - released 2019-07-30

* Implemented support for SERVER_TIMESTAMP and MIC of NTLM protocol
* Improved unit tests for NTLM headers
* Bumped dependencies
* Fix #60: NTLM version can now be set in the cy.ntlm call. Defaults to NTLMv2.
* Fix #62, #64 and #65: Implemented full NTLM handshake. Authentication is only initiated when the server sends a 401 challenge response which indicates that NTLM authentication is supported (previous versions started the handshake proactively). This should resolve the issues seen by some users for:
  * CORS preflight messages (#65)
  * when the server repeats the challenge after first authentication (#64)
  * subsites within a host that does not use NTLM authentication (#62)

## 1.3.0-beta.4 - released 2019-07-29

* Fix #62, #64 and #65: Implemented full NTLM handshake. Authentication is only initiated when the server sends a 401 challenge response which indicates that NTLM authentication is supported. This should resolve the issues seen by some users for:
  * CORS preflight messages
  * when the server repeats the challenge after first authentication
  * subsites within a host that does not use NTLM authentication.

## 1.3.0-beta.3 - released 2019-07-23

* Fix #60: NTLM version can now be set in the cy.ntlm call. Defaults to NTLMv2.

## 1.2.1 - released 2019-07-13

* Made workstation field more consistent in NTLM messages. Fixes authentication issues with some NTLMv2 hosts.

## 1.3.0-beta.2 - released 2019-07-13

* Consistent use of workstation field in NTLM headers

## 1.3.0-beta.1 - released 2019-07-07

* Implemented support for SERVER_TIMESTAMP and MIC of NTLM protocol
* Improved unit tests for NTLM headers
* Bumped dependencies

## 1.2.0 - released 2019-06-29

* Implemented internal NTLM library based on node-ntlm-client
* Unit tests of NTLM headers
* Fixed #55: Authentication of users from another domain than the NTLM target

## 1.1.1 - released 2019-06-22

* Improved documentation of debug logging
* Added more verbose logging of NTLM headers with environment variable `DEBUG_NTLM_HEADERS=1`
* Removed duplicate agent removal

## 1.1.0 - released 2019-06-13

* Fixed #50: Support for NTLMv1 and NTLMv2 through new NTLM library
* Chrome network probing no longer logged as errors
* Bumped dependencies

## 1.0.7 - released 2019-06-07

* Added prepare script to ensure that the latest build is always included on publish
* Fixed #46, cy.ntlmReset now works as intended
* Replaced git reference of http-mitm-proxy dependency with a scoped package to simplify installation procedure. Will revert to the original library when it is released to npm
* Bumped dependencies

## 1.0.6 - released 2019-06-03

* Patch for 1.0.5, the release did not include the latest build
  
## 1.0.5 - released 2019-06-03

* Updated node-http-mitm-proxy for better handling of https tunnel closing

## 1.0.4 - released 2019-05-29

* Patch for 1.0.3, the release did not include the latest build

## 1.0.3 - released 2019-05-29

* Fix issue #40, direct tunnels are now properly closed when client closes connection.
* Removes also non-NTLM agents on proxy shutdown

## 1.0.2 - released 2019-05-24

* Use custom version of node-http-mitm-proxy to resolve issue with delayed 304 responses in Cypress

## 1.0.1 - released 2019-05-23

* Replaced eslint with tslint due to move to TypeScript
* Fixed linter errors
* Updated dependencies, removed unused dependencies
* More stable startup procedure - if an old ntlm-proxy instance is detected, cypress-ntlm will wait a bit for it to quit before polling for the new instance
* Upstream proxies: HTTP_PROXY covers also SSL traffic (HTTPS_PROXY only overrides it)
* Check if cypress is installed on launch
* Updated dependencies
* Lowest supported version of nodejs is now 8.9.3 (since Cypress updated its supported version)

## 1.0.0 - released 2019-05-11

* *BREAKING CHANGE*: The import files for cypress plugin and cypress command have been relocated due to the TypeScript rewrite.
  * Update your import path in `cypress/plugins/index.js`: change `import 'cypress-ntlm-auth/src/plugin'` to `import 'cypress-ntlm-auth/dist/plugin'`
  * Update your import path in `cypress/support/index.js`: change `import 'cypress-ntlm-auth/src/commands'` to `import 'cypress-ntlm-auth/dist/commands'`
* Rewritten in TypeScript
* Applied dependency injection to simplify unit testing
* Improved unit testing
* Added manual duration tests to validate that there are no apparent memory leaks
* Fixed issue #28: Plain GET call to proxy causes infinite loop
* Updated dependencies

## 0.9.4 - released 2019-05-08

* Fixed issue #34: cypress-ntlm now waits up to 5 seconds for ntlm-proxy to start before giving up

## 0.9.3 - released 2019-04-30

* Fixed issue #32: ntlm-proxy now respects the `NODE_TLS_REJECT_UNAUTHORIZED` environment variable
* Added manual duration tests
* Minor adjustment to logging format

## 0.9.2 - released 2019-03-05

* Fixed issue #23: proxying sites on default ports when cy.ntlm was called without the port number.
* Updated dependencies

## 0.9.1 - released 2019-02-14

* Bumped versions of dependencies, now using official version of http-mitm-proxy again
* Added LGTM checking

## 0.9.0 - released 2019-02-08

* Enabled automated unit tests for Windows, OS X and Linux with multiple node versions with Travis-CI
* Improved handling of sockets (used when proxying HTTPS sites) - the ECONNRESET error was not raised on early versions of node and it occurs more commonly on other platforms (Windows). The automated unit tests therefore required that these errors were handled.
* Uses custom version of http-mitm-proxy with improved socket handling (see above) while waiting for a fixed release

## 0.8.1 - released 2019-01-26

* Unit test refactoring
* Cleanup after lint

## 0.8.0 - released 2019-01-25

* Upstream proxy support
* Further improvements to unit tests

## 0.7.2 - released 2019-01-23

* Filter out confusing debug logs from cy.ntlm and cy.ntlmReset calls

## 0.7.1 - released 2019-01-23

* Corrected input validation on cy.ntlm command
* Unit tests for HTTPS

## 0.7.0 - released 2019-01-22

* More complete input validation for arguments to cy.ntlm command and better error reporting
* Corrected docs regarding domain and workstation arguments
* More unit tests

## 0.6.0 - released 2019-01-17

* Fixed issue #11 - Requests other then GET are not properly send
* Improved examples in README for Windows users
* More robust handling of invalid states during NTLM handshake
* Validation that NTLM handshake is fully complete
* The Chrome browser sends three odd requests during startup to detect network behavior. These were logged as errors since they are connecting to non-existent hosts. Those errors are now filtered with understandable debug messages.

## 0.5.0 - released 2019-01-10

* Changed termination handling for common handling also on Windows. This means that the ntlm-proxy is no longer terminated from the signals when cypress exits - instead a separate binary ntlm-proxy-exit is provided that will send the quit command to the ntlm-proxy. This can then be executed directly after cypress exits, see updated README.
* Improved handling of hosts on standard ports (80/443)
* Improved command example comments
* Changed debug prefix to `cypress:plugin:ntlm-auth`

## 0.4.0 - released 2019-01-07

* Replaced platform-folders with appdata-path to reduce build complexity on Windows platform (no node-gyp tool-chain required)
* Added startup validation of HTTP_PROXY environment variable to detect invalid startup

## 0.3.3 - released 2019-01-06

* Improved unit tests
* Code cleanup with eslint
* Minor fixes to NTLM handshake error handling

## 0.3.2 - released 2018-12-27

* Don't show internal communication in Cypress test log
* Documentation layout

## 0.3.1 - released 2018-12-27

* Removed unused files
* Minor documentation improvements (layout, spelling)

## 0.3.0 - released 2018-12-27

* Added graceful termination of the ntlm-proxy process when Cypress exits
* Documentation improvements

## 0.2.0 - released 2018-12-25

* Added support for NTLM hosts with https
* Fixed race condition between new and old proxy instance on startup
* Documentation improvements

## 0.1.2 - released 2018-12-23

* Improved cleanup of agents
* Documentation improvements

## 0.1.1 - released 2018-12-23

* Fixed startup issue
* Added unit tests for portsFile

## 0.1.0 - released 2018-12-23

* Initial release
