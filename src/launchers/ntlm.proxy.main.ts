#!/usr/bin/env node

import { startNtlmProxy } from "../index.js";

/**
 *
 */
async function execute() {
  const ntlmProxy = await startNtlmProxy();
  console.info(ntlmProxy.ports);
}

execute();
