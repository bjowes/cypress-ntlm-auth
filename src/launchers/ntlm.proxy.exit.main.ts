#!/usr/bin/env node

import { stopNtlmProxy } from "../index";

/**
 *
 */
async function execute() {
  const ok = await stopNtlmProxy();
  if (ok) {
    console.info("ntlm-proxy stopped");
  } else {
    console.info("Could not stop ntlm-proxy");
  }
}

execute();
