export interface ICypressFacade {
  cypressLoaded(): boolean;
  run(options: Partial<CypressRunOptions>): Promise<CypressRunResult | CypressFailedRunResult>;
  open(options: Partial<CypressOpenOptions>): Promise<void>;
  parseRunArguments(runArguments: string[]): Promise<Partial<CypressRunOptions>>;
}


/* This is intentionally incomplete to simplify the types */
export interface CypressRunResult {
  totalDuration: number
  totalFailed: number
  totalPassed: number
  totalPending: number
  totalSkipped: number
  totalSuites: number
  totalTests: number
}


export interface CypressNpmApi {
  run(options: Partial<CypressRunOptions>): Promise<CypressRunResult | CypressFailedRunResult>;
  open(options: Partial<CypressOpenOptions>): void;
  cli: {
    parseRunArguments(runArguments: string[]): Promise<Partial<CypressRunOptions>>;
  };
}

    /**
     * All options that one can pass to "cypress.run"
     * @see https://on.cypress.io/module-api#cypress-run
     */
      export interface CypressRunOptions extends CypressCommonOptions {
        /**
         * Specify browser to run tests in, either by name or by filesystem path
         */
        browser: string
        /**
         * Specify a unique identifier for a run to enable grouping or parallelization
         */
        ciBuildId: string
        /**
         * Group recorded tests together under a single run name
         */
        group: string
        /**
         * Tag string for the recorded run, like "production,nightly"
         */
        tag: string
        /**
         * Display the browser instead of running headlessly
         */
        headed: boolean
        /**
         * Hide the browser instead of running headed
         */
        headless: boolean
        /**
         * Specify your secret Record Key
         */
        key: string
        /**
         * Keep Cypress open after all tests run
         */
        noExit: boolean
        /**
         * Run recorded specs in parallel across multiple machines
         */
        parallel: boolean
        /**
         * Override default port
         */
        port: number
        /**
         * Run quietly, using only the configured reporter
         */
        quiet: boolean
        /**
         * Whether to record the test run
         */
        record: boolean
        /**
         * Specify a mocha reporter
         */
        reporter: string
        /**
         * Specify mocha reporter options
         */
        reporterOptions: unknown
        /**
         * Specify the specs to run
         */
        spec: string
        /**
         * Specify the number of failures to cancel a run being recorded to the Cloud or false to disable auto-cancellation.
         */
        autoCancelAfterFailures: number | false
        /**
         * Whether to display the Cypress Runner UI
         */
        runnerUi: boolean
      }
  

  /**
   * All options that one can pass to "cypress.open"
   * @see https://on.cypress.io/module-api#cypress-open
   */
  export interface CypressOpenOptions extends CypressCommonOptions {
    /**
     * Specify browser to run tests in, either by name or by filesystem path
     */
    browser: string
    /**
     * Open Cypress in detached mode
     */
    detached: boolean
    /**
     * Run in global mode
     */
    global: boolean
    /**
     * Override default port
     */
    port: number
  }

 /**
  * Options available for `cypress.open` and `cypress.run`
  */
 interface CypressCommonOptions {
  /**
   * Specify configuration
   */
  config: object // Cypress.ConfigOptions
  /**
   * Path to the config file to be used.
   * @default "cypress.config.{js,ts,mjs,cjs}"
   */
  configFile: string
  /**
   * Specify environment variables.
   * TODO: isn't this duplicate of config.env?!
   */
  env: object
  /**
   * Path to a specific project
   */
  project: string
  /**
   * Specify the type of tests to execute.
   * @default "e2e"
   */
  testingType: object // Cypress.TestingType
}

  /**
   * If Cypress fails to run at all (for example, if there are no spec files to run),
   * then it will return a CypressFailedRunResult. Check the failures attribute.
   */
    export interface CypressFailedRunResult {
      status: 'failed'
      failures: number
      message: string
    }
    