#!/usr/bin/env node

import { checkCypressIsInstalled, run, open, debug } from "../index";

async function prepareOptions(args: string[]) {
  const cypress = require("cypress");
  let cliArguments = args.slice(1);
  cliArguments.unshift("run");
  cliArguments.unshift("cypress");
  return await cypress.cli.parseRunArguments(cliArguments);
}

function getArgsAfterCypressNtlm() {
  const cypressNtlmIndex = process.argv.findIndex(
    (t) => t === "cypress-ntlm" || t.endsWith("node_modules/.bin/cypress-ntlm")
  );
  if (cypressNtlmIndex === -1) {
    debug.log(process.argv);
    throw new Error("Cannot parse command line arguments");
  }
  return process.argv.slice(cypressNtlmIndex + 1);
}

async function execute() {
  checkCypressIsInstalled();
  const args = getArgsAfterCypressNtlm();
  if (args[0] === "open") {
    const options = await prepareOptions(args);
    await open(options);
  } else if (args[0] === "run") {
    const options = await prepareOptions(args);
    await run(options);
  } else {
    throw new Error(
      "Unsupported command, use cypress-ntlm open or cypress-ntlm run."
    );
  }
}

execute();
