#!/usr/bin/env node

import { DependencyInjection } from '../proxy/dependency.injection';
import { TYPES } from '../proxy/dependency.injection.types';
import { INtlmProxyExit } from '../util/interfaces/i.ntlm.proxy.exit';

const container = new DependencyInjection();
let ntlmProxyExit = container.get<INtlmProxyExit>(TYPES.INtlmProxyExit);

(async () => {
  await ntlmProxyExit.quitIfRunning();
})();
