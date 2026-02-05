# Changelog

## 4.2.4 - released 2026-02-05

- Updated cypress to 15.10 for E2E suite
- Fix #272 (Cypress 15.10.0 with allowCypressEnv: false - now gives error) - Thanks @alexsch01 for contributing!

## 4.2.3 - released 2025-05-06

- Dependency bump

## 4.2.2 - released 2025-05-05

- Fix for #264: Handle <-loopback> in NO_PROXY environment variable
- Dependency bump

## 4.2.1 - released 2025-02-04

- Dependency bump
- Added more JSdoc to source

## 4.2.0 - released 2024-09-09

- Fix: Corrected parsing of encoding flags in NTLM header. Thanks @culling

## 4.1.7 - released 2024-04-16

- Fix #254: Handle IPv6 loopback ::1 in NO_PROXY
- Improved error reporting on upstream proxy settings 

## 4.1.6 - released 2024-04-16

- Fix #253: Improved TypeScript typings, updated docs for typings
- Dependency bump

## 4.1.5 - released 2024-03-28

- Fix #249: Corrected dependency versions

## 4.1.4 - released 2024-03-27

- Fix #249: Custom status messages for other requests than NTLM handshake
- Dependency bump

## 4.1.3 - released 2023-09-29

- Fix #241: Include cookies in auth request
- Dependency bump

## 4.1.2 - released 2023-03-05

- Fix #225: Client socket reuse combined with switching protocols (http/https) caused an invalid agent to be used.
- Dependency bump

## 4.1.1 - released 2022-11-04

- Fix #220: Updated readme to reflect current file names used by Cypress
- Added missing debug dependency
- Dependency bump

## 4.1.0 - released 2022-09-21

- Update win-sso for improved Negotiate/Kerberos support
- Detect and reject invalid URL formats in environment variables

## 4.0.5 - released 2022-09-19

- Dependency bump
- Update cypress in test suite, adapted to v10 and typescript

## 4.0.4 - released 2022-09-06

- Fix #210: Cannot call reset when NTLM host '*' is configured

## 4.0.3 - released 2022-09-06

- Fix #208: Cannot set port for ntlm-proxy

## 4.0.2 - released 2022-05-07

- Bump dependencies

## 4.0.1 - released 2022-04-23

- Support Node 18

## 4.0.0 - released 2022-04-13

- Refactored HTTPS validation. By default, the validation will only warn of errors but not break the test. See [HTTPS/SSL/TLS Certificates](docs/tls_certificates.md) for details.
- Improved error logging
- Support Node 17
- Fixed support from 14.13.1
- HTTPS stability improvements
- IPv6 support. Cypress does not fully support IPv6 yet though.

## 3.2.6 - released 2022-02-19

- Fix issue #194 - went back to commonjs for wider compatibility

## 3.2.5 - released 2022-02-10

- Fix issue in 3.2.4 with SSL tunnels

## 3.2.4 - released 2022-02-09 *deprecated*

- Migrated to ESM
- Bump dependencies
- Implemented internal tunnelling agent

## 3.2.3 - released 2021-06-23

- Fix #175: Pass on custom status phrases in response

## 3.2.2 - released 2021-05-10

- Bump dependencies

## 3.2.1 - released 2021-05-10

- Bump dependencies

## 3.2.0 - released 2021-03-16

- Fix #163: Break client connection on network error

## 3.1.7 - released 2021-02-12

- Fix #161: Re-authenticate on new request after authentication failed

## 3.1.6 - released 2021-02-09

- Fix #159: Support cypress with typescript specfiles

## 3.1.5 - released 2021-01-12

- Fix #157: Corrected peer dependency version of Cypress, accept any version from 5.0.0 and up
- Bump dependencies

## 3.1.4 - released 2021-01-02

- Migrated to Github Actions

## 3.1.3 - released 2020-12-23

- Fix #151: Remove unused dependencies
- Migrated from tslint to ESlint

## 3.1.2 - released 2020-12-06

- Fix #144: websockets were not correctly closed on ntlmReset
- Added E2E tests to CI

## 3.1.1 - released 2020-10-31

- Update http-mitm-proxy

## 3.1.0 - released 2020-10-23

- Fix #138: Exported Node module API for creating, controlling and stopping multiple ntlm-proxy instances

## 3.0.1 - released 2020-10-21

- Fix #139: cypress-ntlm launcher updated to support global install
- Updated docs with Docker info

## 3.0.0 - released 2020-10-02

- Support for multiple instances!
- Rewritten launcher, ntlm-proxy is now started as part of cypress-ntlm
- Cypress plugin config no longer needed - this means that it is now possible to launch cypress or cypress-ntlm without modifying the plugins file.
- Return 502 if connect fails
- Fix #129: It is now possible to specify ports for configApi and ntlmProxy using environment variables when starting ntlm-proxy
- Alive now returns the current ports
- Use of external ntlm-proxy now only requires setting CYPRESS_NTLM_AUTH_API environment variable
- Fix #114: Close client sockets on reset or quit
- Clean up socket close listeners

## 2.3.0 - released 2020-09-20

- Fix #117 - Support wildcards in cy.ntlm
- Package bumps

## 2.2.5 - released 2020-03-18

- Better logging when Negotiate authentication fails

## 2.2.4 - released 2020-03-02

- Improved detection of SSO usage after reset

## 2.2.3 - released 2020-02-19

- Updated fix #101 - Override additional unused proxy environment variables before launching cypress to avoid conflicting configurations.

## 2.2.2 - released 2020-02-19

- Fix #101 - Override unused proxy environment variables before launching cypress to avoid conflicting configurations.

## 2.2.1 - released 2020-02-08

- Fix #99 - Update useSso property on each request to improve stability after ntlmReset

## 2.2.0 - released 2020-02-02

- Fix #95 - Add 127.0.01 to NO_PROXY for axios compatibility
- Better usability with corporate proxies - NO_PROXY now includes localhost and 127.0.0.1 by default to simplify configuration
- Package bumps

## 2.1.0 - released 2020-01-11

- Improvements in Negotiate authentication.
- Unit tests for Negotiate authentication.

## 2.0.5 - released 2019-12-03

- Fix #76 - SSO hosts can now be specified using wildcards.

## 2.0.4 - released 2019-11-28

- Unit tests for fix of #88
- Handled the case when server prompts for reauthentication after a host reconfiguration
- Fixed #86: Increased startup wait time for ntlm-proxy to 15 seconds

## 2.0.3 - released 2019-11-13

- Attempt to fix #80 without a forced quit. All tunnels established for HTTPS passthrough are now indexed and closed on reset or quit.
- Moved back to original http-mitm-proxy since the required changes are now in the official release.
- Package bumps

## 2.0.2 - released 2019-10-29

- Fixed #81: Cypress 3.5.0 now supported also for localhost sites.
- Improved responses on failed handshakes
- Minor improvements for NodeJS 13 compatibility

## 2.0.1 - released 2019-10-14

- Fixed #75: Node module API available. The ntlm-proxy and cypress can now be started as a function call in node, see the README for example code.

## 2.0.0 - released 2019-10-12

- Fixed #73: Single sign on is here! This is a big improvement in usability and security (no password required) for use cases where authentication only needs a single user, and that user is the same as the account running the tests. Naturally this only works on Windows OSs test clients.

## 1.3.2 - released 2019-08-28

- Fix #58: Refactored NTLM library to typescript
- Fix #71: Reuse actual NTLM type 1 message when calculating MIC
- Package bump

## 1.3.1 - released 2019-08-02

- Package bump due to security issue

## 1.3.0 - released 2019-07-30

- Implemented support for SERVER_TIMESTAMP and MIC of NTLM protocol
- Improved unit tests for NTLM headers
- Bumped dependencies
- Fix #60: NTLM version can now be set in the cy.ntlm call. Defaults to NTLMv2.
- Fix #62, #64 and #65: Implemented full NTLM handshake. Authentication is only initiated when the server sends a 401 challenge response which indicates that NTLM authentication is supported (previous versions started the handshake proactively). This should resolve the issues seen by some users for:
  - CORS preflight messages (#65)
  - when the server repeats the challenge after first authentication (#64)
  - subsites within a host that does not use NTLM authentication (#62)

## 1.2.1 - released 2019-07-13

- Made workstation field more consistent in NTLM messages. Fixes authentication issues with some NTLMv2 hosts.

## 1.2.0 - released 2019-06-29

- Implemented internal NTLM library based on node-ntlm-client
- Unit tests of NTLM headers
- Fixed #55: Authentication of users from another domain than the NTLM target

## 1.1.1 - released 2019-06-22

- Improved documentation of debug logging
- Added more verbose logging of NTLM headers with environment variable `DEBUG_NTLM_HEADERS=1`
- Removed duplicate agent removal

## 1.1.0 - released 2019-06-13

- Fixed #50: Support for NTLMv1 and NTLMv2 through new NTLM library
- Chrome network probing no longer logged as errors
- Bumped dependencies

## 1.0.7 - released 2019-06-07

- Added prepare script to ensure that the latest build is always included on publish
- Fixed #46, cy.ntlmReset now works as intended
- Replaced git reference of http-mitm-proxy dependency with a scoped package to simplify installation procedure. Will revert to the original library when it is released to npm
- Bumped dependencies

## 1.0.6 - released 2019-06-03

- Patch for 1.0.5, the release did not include the latest build

## 1.0.5 - released 2019-06-03

- Updated node-http-mitm-proxy for better handling of https tunnel closing

## 1.0.4 - released 2019-05-29

- Patch for 1.0.3, the release did not include the latest build

## 1.0.3 - released 2019-05-29

- Fix issue #40, direct tunnels are now properly closed when client closes connection.
- Removes also non-NTLM agents on proxy shutdown

## 1.0.2 - released 2019-05-24

- Use custom version of node-http-mitm-proxy to resolve issue with delayed 304 responses in Cypress

## 1.0.1 - released 2019-05-23

- Replaced eslint with tslint due to move to TypeScript
- Fixed linter errors
- Updated dependencies, removed unused dependencies
- More stable startup procedure - if an old ntlm-proxy instance is detected, cypress-ntlm will wait a bit for it to quit before polling for the new instance
- Upstream proxies: HTTP_PROXY covers also SSL traffic (HTTPS_PROXY only overrides it)
- Check if cypress is installed on launch
- Updated dependencies
- Lowest supported version of nodejs is now 8.9.3 (since Cypress updated its supported version)

## 1.0.0 - released 2019-05-11

- _BREAKING CHANGE_: The import files for cypress plugin and cypress command have been relocated due to the TypeScript rewrite.
  - Update your import path in `cypress/plugins/index.js`: change `import 'cypress-ntlm-auth/src/plugin'` to `import 'cypress-ntlm-auth/dist/plugin'`
  - Update your import path in `cypress/support/index.js`: change `import 'cypress-ntlm-auth/src/commands'` to `import 'cypress-ntlm-auth/dist/commands'`
- Rewritten in TypeScript
- Applied dependency injection to simplify unit testing
- Improved unit testing
- Added manual duration tests to validate that there are no apparent memory leaks
- Fixed issue #28: Plain GET call to proxy causes infinite loop
- Updated dependencies

## 0.9.4 - released 2019-05-08

- Fixed issue #34: cypress-ntlm now waits up to 5 seconds for ntlm-proxy to start before giving up

## 0.9.3 - released 2019-04-30

- Fixed issue #32: ntlm-proxy now respects the `NODE_TLS_REJECT_UNAUTHORIZED` environment variable
- Added manual duration tests
- Minor adjustment to logging format

## 0.9.2 - released 2019-03-05

- Fixed issue #23: proxying sites on default ports when cy.ntlm was called without the port number.
- Updated dependencies

## 0.9.1 - released 2019-02-14

- Bumped versions of dependencies, now using official version of http-mitm-proxy again
- Added LGTM checking

## 0.9.0 - released 2019-02-08

- Enabled automated unit tests for Windows, OS X and Linux with multiple node versions with Travis-CI
- Improved handling of sockets (used when proxying HTTPS sites) - the ECONNRESET error was not raised on early versions of node and it occurs more commonly on other platforms (Windows). The automated unit tests therefore required that these errors were handled.
- Uses custom version of http-mitm-proxy with improved socket handling (see above) while waiting for a fixed release

## 0.8.1 - released 2019-01-26

- Unit test refactoring
- Cleanup after lint

## 0.8.0 - released 2019-01-25

- Upstream proxy support
- Further improvements to unit tests

## 0.7.2 - released 2019-01-23

- Filter out confusing debug logs from cy.ntlm and cy.ntlmReset calls

## 0.7.1 - released 2019-01-23

- Corrected input validation on cy.ntlm command
- Unit tests for HTTPS

## 0.7.0 - released 2019-01-22

- More complete input validation for arguments to cy.ntlm command and better error reporting
- Corrected docs regarding domain and workstation arguments
- More unit tests

## 0.6.0 - released 2019-01-17

- Fixed issue #11 - Requests other then GET are not properly send
- Improved examples in README for Windows users
- More robust handling of invalid states during NTLM handshake
- Validation that NTLM handshake is fully complete
- The Chrome browser sends three odd requests during startup to detect network behavior. These were logged as errors since they are connecting to non-existent hosts. Those errors are now filtered with understandable debug messages.

## 0.5.0 - released 2019-01-10

- Changed termination handling for common handling also on Windows. This means that the ntlm-proxy is no longer terminated from the signals when cypress exits - instead a separate binary ntlm-proxy-exit is provided that will send the quit command to the ntlm-proxy. This can then be executed directly after cypress exits, see updated README.
- Improved handling of hosts on standard ports (80/443)
- Improved command example comments
- Changed debug prefix to `cypress:plugin:ntlm-auth`

## 0.4.0 - released 2019-01-07

- Replaced platform-folders with appdata-path to reduce build complexity on Windows platform (no node-gyp tool-chain required)
- Added startup validation of HTTP_PROXY environment variable to detect invalid startup

## 0.3.3 - released 2019-01-06

- Improved unit tests
- Code cleanup with eslint
- Minor fixes to NTLM handshake error handling

## 0.3.2 - released 2018-12-27

- Don't show internal communication in Cypress test log
- Documentation layout

## 0.3.1 - released 2018-12-27

- Removed unused files
- Minor documentation improvements (layout, spelling)

## 0.3.0 - released 2018-12-27

- Added graceful termination of the ntlm-proxy process when Cypress exits
- Documentation improvements

## 0.2.0 - released 2018-12-25

- Added support for NTLM hosts with https
- Fixed race condition between new and old proxy instance on startup
- Documentation improvements

## 0.1.2 - released 2018-12-23

- Improved cleanup of agents
- Documentation improvements

## 0.1.1 - released 2018-12-23

- Fixed startup issue
- Added unit tests for portsFile

## 0.1.0 - released 2018-12-23

- Initial release
