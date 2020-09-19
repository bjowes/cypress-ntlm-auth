/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable<Subject> {
    /**
     * Adds NTLM authentication support to Cypress for a specific host.
     * You can call this multiple times to register several hosts or
     * change credentials.
     * The first parameter should be an array of hostnames, but the legacy variant with just a string is still supported.
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
     * @example
 ```js
  cy.ntlmSso(['ntlm.acme.com', '*.internal.acme.com');
 ```
     */
    ntlmSso(ntlmHosts: string[]): Chainable<any>;

    /**
     * Reset NTLM authentication for all configured hosts. Recommended before/after tests.
     * @example
 ```js
  cy.ntlmReset();
 ```
     */
    ntlmReset(): Chainable<any>;
  }
}
