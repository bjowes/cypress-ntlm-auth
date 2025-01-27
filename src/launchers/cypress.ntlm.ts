#!/usr/bin/env node

import {
  run,
  open,
  argumentsToCypressMode,
  argumentsToOptions,
} from "../index";

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
      const failedResult = result as CypressCommandLine.CypressFailedRunResult;
      if (failedResult && failedResult.failures) {
        console.error("Cypress could not execute tests");
        console.error(failedResult.message);
        process.exit(failedResult.failures);
      }
      // Required on windows since Cypress hangs after the run call
      const runResult = result as CypressCommandLine.CypressRunResult;
      process.exit(runResult.totalFailed);
    }
  } catch (err) {
    console.error((err as NodeJS.ErrnoException).message);
    console.error(err);
    process.exit(1);
  }
}

execute();
