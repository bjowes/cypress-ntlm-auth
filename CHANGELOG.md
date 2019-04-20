# Changelog

## 1.0.0 - released 2019-04-20

* *BREAKING CHANGE*: The import files for cypress plugin and cypress command have been relocated due to the TypeScript rewrite.
  * Update your import path in `cypress/plugins/index.js`: change `import 'cypress-ntlm-auth/src/plugin'` to `import 'cypress-ntlm-auth/dist/plugin'`
  * Update your import path in `cypress/support/index.js`: change `import 'cypress-ntlm-auth/src/commands'` to `import 'cypress-ntlm-auth/dist/commands'`
* Rewritten in TypeScript
* Improved unit testing
* Fixed issue #28: Plain GET call to proxy causes infinite loop
* Updated dependencies

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
