import { defineConfig } from 'cypress'
import installLogsPrinter from 'cypress-terminal-report/src/installLogsPrinter';

export default defineConfig({
  video: false,
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      installLogsPrinter(on);
    },
  }
})
