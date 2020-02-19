#!/usr/bin/env node

import { DependencyInjection } from "../proxy/dependency.injection";
import { TYPES } from "../proxy/dependency.injection.types";
import { ICypressNtlm } from "../util/interfaces/i.cypress.ntlm";
import { IUpstreamProxyConfigurator } from "../util/interfaces/i.upstream.proxy.configurator";

const container = new DependencyInjection();
let cypressNtlm = container.get<ICypressNtlm>(TYPES.ICypressNtlm);
const upstreamProxyConfigurator = container.get<IUpstreamProxyConfigurator>(
  TYPES.IUpstreamProxyConfigurator
);

if (cypressNtlm.checkCypressIsInstalled() === false) {
  process.stderr.write(
    "ERROR: cypress-ntlm requires Cypress to be installed.\n"
  );
  process.exit(1);
}

upstreamProxyConfigurator.processNoProxyLoopback();

cypressNtlm
  .checkProxyIsRunning(15000, 200)
  .then(portsFile => {
    process.env.HTTP_PROXY = portsFile.ntlmProxyUrl;
    process.env.HTTPS_PROXY = portsFile.ntlmProxyUrl;
    process.env.NO_PROXY = "<-loopback>";

    // Start up Cypress and let it parse any command line arguments
    require("cypress/lib/cli").init();
  })
  .catch(() => {
    process.stderr.write(
      "ERROR: ntlm-proxy must be started before this command\n"
    );
    process.exit(1);
  });
