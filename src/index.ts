import { DependencyInjection } from './proxy/dependency.injection';
import { TYPES } from './proxy/dependency.injection.types';
import { IMain } from './proxy/interfaces/i.main';
import { ICypressNtlm } from './util/interfaces/i.cypress.ntlm';

const cypress = require('cypress');

const container = new DependencyInjection();
let cypressNtlm = container.get<ICypressNtlm>(TYPES.ICypressNtlm);
let proxyMain = container.get<IMain>(TYPES.IMain);

export async function run(options): Promise<any> {
  return new Promise((resolve, reject) => {
    if (cypressNtlm.checkCypressIsInstalled() === false) {
      throw new Error('cypress-ntlm-auth requires Cypress to be installed.\n');
    }

    proxyMain.run(false, process.env.HTTP_PROXY, process.env.HTTPS_PROXY, process.env.NO_PROXY)
    .then(() => {
      cypressNtlm.checkProxyIsRunning(5000, 200)
      .then((portsFile) => {
        process.env.HTTP_PROXY = portsFile.ntlmProxyUrl;
        process.env.NO_PROXY = '';

        // Start up Cypress and let it parse any options
        cypress.run(options)
        .then(result => {
          proxyMain.stop().then(() => resolve(result));
        })
        .catch(err => {
          proxyMain.stop().then(() => reject(err));
        });
      });
    });
  });
}


