// Bootstraps ts-node with a special tsconfig.json,
// which disables strict null checking (required by substitute mocking library)

require('ts-node').register({
  project: 'test/tsconfig.json',
});
