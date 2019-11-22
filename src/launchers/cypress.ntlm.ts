#!/usr/bin/env node

import { run, open } from '../index';
const minimist = require('minimist');

const runOptions = {
  string: ['browser', 'b', 'ciBuildId', 'config', 'c', 'configFile', 'C', 'env', 'e', 'group', 'key', 'k', 'project', 'P', 'reporter', 'r', 'reporterOptions', 'o', 'spec', 's'],
  number: ['port', 'p'],
  boolean: ['headed', 'exit', 'parallel', 'record'],
  default: { exit: true },
};

const openOptions = {
  string: ['browser', 'b', 'config', 'c', 'configFile', 'C', 'env', 'e', 'project', 'P'],
  number: ['port', 'p'],
  boolean: ['detached', 'd', 'global']
};

function parseCypressCommand() {
  if (process.argv.length < 3) {
    console.log('Insufficient arguments.');
    usage();
    process.exit(1);
  }
  return process.argv[2];
}

function parseArguments(cypressCommand: string) {
  if (cypressCommand === 'run') {
    return minimist(process.argv.slice(3), runOptions);
  } else if (cypressCommand === 'open') {
    return minimist(process.argv.slice(3), openOptions);
  } else {
    console.log('Unknown argument:', cypressCommand);
    usage();
    process.exit(1);
  }
}

function usage() {
  console.log('usage: \n' +
  'npx cypress-ntlm run [cypress options]\n' +
  'or\n' +
  'npx cypress-ntlm open [cypress options]\n' +
  '\n' +
  'for available cypress options, see https://docs.cypress.io/guides/guides/module-api.html');
}

const cypressCommand = parseCypressCommand();
const options = parseArguments(cypressCommand);
if (cypressCommand === 'run') {
  run(options);
} else if (cypressCommand === 'open') {
  open(options);
}
