/**
   * Prepare Cypress for cypress-ntlm-auth plugin.
   * @example
 ```js
const ntlmAuth = require("cypress-ntlm-auth/dist/plugin");
module.exports = (on, config) => {
  ntlmAuth.initNtlmAuth(config);
  return config;
};
 ```
   */
export function initNtlmAuth(config: any): Promise<any>;
