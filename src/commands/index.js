'use strict';

/// <reference types="cypress" />


/**
 * Adds NTLM authentication support to Cypress using custom commands.
 *
 * @example
 ```js
  // Enable NTLM auth for a specific site. You can call this multiple times to register several sites
  cy.ntlm('https://frontend-ntlm.intranet.company.com', 'TheUser', 'ThePassword', 'TheDomain');
  cy.visit('/');
  // Tests ...

  // To disable NTLM auth for all hosts, use the ntlmReset command
  cy.ntlmReset();
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
