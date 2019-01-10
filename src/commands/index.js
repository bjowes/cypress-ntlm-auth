'use strict';

/// <reference types="cypress" />


/**
 * Adds NTLM authentication support to Cypress for a specific host.
 *
 * @example
 ```js
  // Enable NTLM auth for a specific host. You can call this multiple times
  // to register several hosts or change credentials.
  cy.ntlm('https://ntlm.acme.com', 'TheUser', 'ThePassword', 'TheDomain');
  cy.visit('/');
  // Tests ...
 ```
 */
const ntlm = (ntlmHost, username, password, domain, workstation) => {
  const log = {
    name: 'ntlm',
    message: { ntlmHost, username }
  };

  const ntlmProxy = Cypress.env('NTLM_AUTH_PROXY');
  const ntlmConfigApi = Cypress.env('NTLM_AUTH_API');
  if (!ntlmProxy || !ntlmConfigApi) {
    throw new Error('The cypress-ntlm-auth plugin must be loaded before using this method');
  }

  let result;

  cy.request({
    method: 'POST',
    url: ntlmConfigApi + '/ntlm-config',
    body: {
      ntlmHost: ntlmHost,
      username: username,
      password: password,
      domain: domain,
      workstation: workstation
    },
    log: false // This isn't communication with the test object, so don't show it in the test log
  }).then((resp) => {
    if (resp.status === 200) {
      result = 'Enabled NTLM authentication for host ' + ntlmHost;
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
    };
  };

  Cypress.log(log);
};

/**
 * Reset NTLM authentication for all configured hosts. Recommended before/after tests.
 *
 * @example
 ```js
  // Disables NTLM auth for all configured hosts.
  cy.ntlmReset();
 ```
 */

const ntlmReset = () => {
  const log = {
    name: 'ntlmReset',
    message: {}
  };

  const ntlmProxy = Cypress.env('NTLM_AUTH_PROXY');
  const ntlmConfigApi = Cypress.env('NTLM_AUTH_API');
  if (!ntlmProxy || !ntlmConfigApi) {
    throw new Error('The cypress-ntlm-auth plugin must be loaded before using this method');
  }

  let result;

  cy.request({
    method: 'POST',
    url: ntlmConfigApi + '/reset',
    body: {},
    log: false // This isn't communication with the test object, so don't show it in the test log
  }).then((resp) => {
    if (resp.status === 200) {
      result = 'NTLM authentication reset OK, no hosts configured';
    } else {
      result = 'failed';
      throw new Error('Could not reset cypress-ntlm-auth plugin. Error returned: "' + resp.body + '"');
    }
  });

  log.consoleProps = () => {
    return {
      result: result
    };
  };

  Cypress.log(log);
};

Cypress.Commands.add('ntlm', { prevSubject: false }, ntlm);
Cypress.Commands.add('ntlmReset', { prevSubject: false }, ntlmReset);
