#!/usr/bin/env node

import { startNtlmProxy } from "../index";

/**
 *
 */
async function execute() {
  const ntlmProxy = await startNtlmProxy();
  console.info(ntlmProxy.ports);
}

execute();
