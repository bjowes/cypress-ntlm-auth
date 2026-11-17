#!/usr/bin/env node

import { startNtlmProxy } from "../index.ts";

/**
 *
 */
async function execute() {
  const ntlmProxy = await startNtlmProxy();
  console.info(ntlmProxy.ports);
}

execute();
