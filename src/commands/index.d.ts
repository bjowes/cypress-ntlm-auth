/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable<Subject> {
    /**
     * Adds NTLM authentication support to Cypress for a specific host.
     * You can call this multiple times to register several hosts or
     * change credentials.
     * @example
 ```js
  cy.ntlm('https://ntlm.acme.com', 'TheUser', 'ThePassword', 'TheDomain');
 ```
    */
    ntlm(ntlmHost: string, username: string, password: string, domain?: string, workstation?: string, ntlmVersion?: number): Chainable<any>

    /**
     * Adds NTLM Single-sign-on authentication support to Cypress for
     * specific hosts. Wildcards are not supported.
     * Calling this multiple times replaces previous SSO configuration.
     * @example
 ```js
  cy.ntlmSso(['ntlm.acme.com', 'api.internal.acme.com');
 ```
     */
   ntlmSso(ntlmHosts: string[]): Chainable<any>

    /**
     * Reset NTLM authentication for all configured hosts. Recommended before/after tests.
     * @example
 ```js
  cy.ntlmReset();
 ```
     */
    ntlmReset(): Chainable<any>
  }
}
