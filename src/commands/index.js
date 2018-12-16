'use strict';

/// <reference types="cypress" />


/**
 * Adds NTLM autentication support to Cypress using custom commands.
 *
 * @example
 ```js
  // Enable NTLM auth for a specific site - this overwrites your baseUrl
  cy.ntlm('https://frontend-ntlm.intranet.company.com', 'TheUser', 'ThePassword', 'TheDomain');
  cy.visit('/');
  // Tests ...

  // To disable NTLM auth, set a new baseUrl
  Cypress.config('baseUrl', 'https://frontend-form.intranet.company.com');
 ```
 */

 
const ntlm = (ntlmHost, username, password, domain, workstation) => {
  const log = {
    name: 'ntlm',
    message: {ntlmHost, username}
  }

  const ntlmProxy = Cypress.env('CYPRESS_NTLM_AUTH_PROXY');
  const ntlmConfigApi = Cypress.env('CYPRESS_NTLM_AUTH_API');
  if (!ntlmProxy || !ntlmConfigApi) {
    throw new Error("The cypress-ntlm-auth plugin must be loaded before using this method");
  }

  let result;

  cy.request({
    method: 'POST', 
    url: ntlmConfigApi + '/ntlm-config', 
    body: {ntlmHost: ntlmHost, username: username, password: password, domain: domain, workstation: workstation},
    log: true // This isn't communication with the test object, so don't show it in the test log
  }).then((resp) => {
    if (resp.status === 200) {
      result = 'Enabled NTLM authentication for host ' + ntlmHost;
      Cypress.config('baseUrl', ntlmProxy);
    } else {
      result = 'failed';
      throw new Error('Could not configure cypress-ntlm-auth plugin. Error returned: "' + resp.body + '"');
    }
  });

  log.consoleProps = () => {
    return {
      ntlmHost: ntlmHost,
      username: username,
      domain: domain,
      workstation: workstation,
      result: result
    }
  }

  Cypress.log(log);
}
  
Cypress.Commands.add('ntlm', { prevSubject: false }, ntlm);