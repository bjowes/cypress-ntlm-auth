#!/usr/bin/env node

import { run, open, argumentsToCypressMode, argumentsToOptions } from "../index.js";

/**
 *
 */
async function execute() {
  try {
    const mode = argumentsToCypressMode(process.argv);
    const options = await argumentsToOptions(process.argv);
    if (mode === "open") {
      await open(options);
    } else {
      const result = await run(options);
      if (result.failures) {
        console.error("Cypress could not execute tests");
        console.error(result.message);
        process.exit(result.failures);
      }
      // Required on windows since Cypress hangs after the run call
      process.exit(result.totalFailed);
    }
  } catch (err) {
    console.error((err as NodeJS.ErrnoException).message);
    console.error(err);
    process.exit(1);
  }
}

execute();
