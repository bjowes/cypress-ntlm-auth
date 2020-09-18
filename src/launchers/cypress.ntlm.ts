#!/usr/bin/env node

import { checkCypressIsInstalled, run, open, debug } from "../index";

async function prepareOptions() {
  const cypress = require("cypress");
  let cliArguments = process.argv.slice(3);
  cliArguments.unshift("run");
  cliArguments.unshift("cypress");
  return await cypress.cli.parseRunArguments(cliArguments);
}

async function execute() {
  checkCypressIsInstalled();
  if (process.argv[2] === "open") {
    const options = await prepareOptions();
    const results = await open(options);
  } else if (process.argv[2] === "run") {
    const options = await prepareOptions();
    const results = await run(options);
  } else {
    throw new Error("Unsupported command");
  }
}

execute();
