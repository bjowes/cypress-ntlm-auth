#!/usr/bin/env node

console.error('Launching ntlm-proxy separately is the legacy method to launch cypress-ntlm.');
console.error('Since cypress-ntlm-auth@2.1.0 the combined launcher should be used.');
console.error('See https://github.com/bjowes/cypress-ntlm-auth/');

process.exit(1);
