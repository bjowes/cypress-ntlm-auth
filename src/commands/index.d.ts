/* eslint-disable no-unused-vars */
// / <reference types="cypress" />

declare namespace Cypress {
  interface Chainable<Subject> {
    /**
     * Adds NTLM authentication support to Cypress for a specific host.
     * You can call this multiple times to register several hosts or
     * change credentials.
     *
     * @param {Array} ntlmHosts array of FQDNs or hostnames of the servers where NTLM authentication shall be
     * applied. The hosts must NOT include protocol or the rest of the url (path and query) - only host:port level
     * authentication is supported. In addition, wildcards are allowed to simplify specifying hosts for a whole
     * intranet. Ports cannot be combined with wildcards. Example: `['localhost:4200', '*.acme.com']`
     * @param {string} username the username for the account to authenticate with
     * @param {string} password the password or the account to authenticate with
     * @param {string} domain (optional) the domain for the account to authenticate with
     * (for AD account authentication). Default value: the domain of the ntlmHost.
     * @param {string} workstation (optional) the workstation name of the client. Default value: `os.hostname()`
     * @param {number} ntlmVersion (optional) the version of the NTLM protocol to use. Valid values are 1 and 2.
     * Default value: 2. This can be useful for legacy hosts that don't support NTLMv2 or for certain scenarios where
     * the NTLMv2 handshake fails (the plugin does not implement all features of NTLMv2 yet).
     * @example
      ```js
      cy.ntlm(['ntlm.acme.com','api.acme.com'], 'TheUser', 'ThePassword', 'TheDomain');
      ```
     */
    ntlm(
      ntlmHosts: string[] | string,
      username: string,
      password: string,
      domain?: string,
      workstation?: string,
      ntlmVersion?: number
    ): Chainable<any>;

    /**
     * Adds NTLM Single-sign-on authentication support to Cypress for
     * specific hosts. Wildcards are supported.
     * Calling this multiple times replaces previous SSO configuration.
     *
     * @param {Array} ntlmHosts array of FQDNs or hostnames of the servers where NTLM or Negotiate authentication with
     * single sign on shall be applied. The hosts must NOT include protocol, port or the rest of the url
     * (path and query) - only host level authentication is supported. In addition, wildcards are allowed to simplify
     * specifying SSO for a whole intranet. Example: `['localhost', '*.acme.com']`
     * @example
      ```js
        cy.ntlmSso(['ntlm.acme.com', '*.internal.acme.com');
      ```
     */
    ntlmSso(ntlmHosts: string[]): Chainable<any>;

    /**
     * Reset NTLM authentication for all configured hosts. Recommended before/after tests.
     *
     * @example
 ```js
  cy.ntlmReset();
 ```
     */
    ntlmReset(): Chainable<any>;
  }
}
