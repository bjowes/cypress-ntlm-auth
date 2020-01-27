#!/usr/bin/env node

import { DependencyInjection } from "../proxy/dependency.injection";
import { TYPES } from "../proxy/dependency.injection.types";
import { INtlmProxyExit } from "../util/interfaces/i.ntlm.proxy.exit";
import { IUpstreamProxyConfigurator } from "../util/interfaces/i.upstream.proxy.configurator";

const container = new DependencyInjection();
const ntlmProxyExit = container.get<INtlmProxyExit>(TYPES.INtlmProxyExit);
const upstreamProxyConfigurator = container.get<IUpstreamProxyConfigurator>(
  TYPES.IUpstreamProxyConfigurator
);

upstreamProxyConfigurator.processNoProxyLoopback();

(async () => {
  await ntlmProxyExit.quitIfRunning();
})();
