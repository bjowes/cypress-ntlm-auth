#!/usr/bin/env node

import { DependencyInjection } from "../proxy/dependency.injection";
import { TYPES } from "../proxy/dependency.injection.types";
import { IEnvironment } from "../startup/interfaces/i.environment";
import { IExternalNtlmProxyFacade } from "../startup/interfaces/i.external.ntlm.proxy.facade";
import { IUpstreamProxyConfigurator } from "../startup/interfaces/i.upstream.proxy.configurator";

const container = new DependencyInjection();
const externalNtlmProxyFacade = container.get<IExternalNtlmProxyFacade>(
  TYPES.IExternalNtlmProxyFacade
);
const upstreamProxyConfigurator = container.get<IUpstreamProxyConfigurator>(
  TYPES.IUpstreamProxyConfigurator
);
let environment = container.get<IEnvironment>(TYPES.IEnvironment);

upstreamProxyConfigurator.processNoProxyLoopback();

(async () => {
  await externalNtlmProxyFacade.quitIfRunning(environment.configApiUrl);
})();
