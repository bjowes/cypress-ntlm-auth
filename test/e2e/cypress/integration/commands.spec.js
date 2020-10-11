/// <reference types="Cypress" />

import { osSupported } from "win-sso";

context("Commands", function () {
  context("Plugin required", function () {
    let ntlm_auth_proxy;
    let ntlm_auth_api;

    before("Backup and clear env", function () {
      ntlm_auth_proxy = Cypress.env("NTLM_AUTH_PROXY");
      ntlm_auth_api = Cypress.env("NTLM_AUTH_API");
      Cypress.env("NTLM_AUTH_PROXY", undefined);
      Cypress.env("NTLM_AUTH_API", undefined);
    });

    it("NTLM should fail without plugin env", function () {
      expectFail(
        "The cypress-ntlm-auth plugin must be loaded before using this method"
      );
      cy.ntlm();
    });

    it("NTLM SSO should fail without plugin env", function () {
      expectFail(
        "The cypress-ntlm-auth plugin must be loaded before using this method"
      );
      cy.ntlmSso();
    });

    it("NTLM Reset should fail without plugin env", function () {
      expectFail(
        "The cypress-ntlm-auth plugin must be loaded before using this method"
      );
      cy.ntlmReset();
    });

    after("Restore env", function () {
      Cypress.env("NTLM_AUTH_PROXY", ntlm_auth_proxy);
      Cypress.env("NTLM_AUTH_API", ntlm_auth_api);
    });
  });

  context("NTLM config", function () {
    const httpHost = "http://localhost:5000";

    beforeEach("Reset NTLM config", function () {
      cy.ntlmReset();
    });

    it("cy.ntlm with invalid ntlmHosts shall not succeed", function () {
      expectFail("Invalid ntlmHosts, must be an array.");
      cy.ntlm({}, "nis\\se", "manpower", "mpatst");
    });

    it("cy.ntlm with invalid ntlmHosts shall not succeed", function () {
      expectFail("Invalid ntlmHosts, must be an array.");
      cy.ntlm({}, "nis\\se", "manpower", "mpatst");
    });

    it("cy.ntlm with invalid username shall not succeed", function () {
      expectFail("Username contains invalid characters or is too long.");
      cy.ntlm(httpHost, "nis\\se", "manpower", "mpatst");
    });

    it("cy.ntlm with invalid domain shall not succeed", function () {
      expectFail("Domain contains invalid characters or is too long.");
      cy.ntlm(httpHost, "nisse", "manpower", "mpa\\tst");
    });

    it("cy.ntlm with missing password shall not succeed", function () {
      expectFail(
        "Incomplete configuration. ntlmHosts, username, password and ntlmVersion are required fields."
      );
      cy.ntlm(httpHost, "nisse", null, "mpatst");
    });

    it("cy.ntlm with bad ntlmVersion shall not succeed", function () {
      expectFail("Invalid ntlmVersion. Must be 1 or 2.");
      cy.ntlm(httpHost, "nisse", "manpower", "mpatst", undefined, -1);
    });

    it("cy.ntlm with bad url shall not succeed", function () {
      expectFail(
        "Invalid ntlmHost, must not contain any path or query (https://www.google.com is ok, https://www.google.com/search is not ok)"
      );
      cy.ntlm("http://google.com/search", "nisse", "manpower", "mpatst");
    });
  });

  context("NTLM SSO config", function () {
    const httpHost = "http://localhost:5000";

    beforeEach("Reset NTLM config", function () {
      cy.ntlmReset();
    });

    it("cy.ntlmSso with protocol in ntlmHosts shall not succeed", function () {
      expectFail(
        "Invalid host [http://google.com] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
      );
      cy.ntlmSso(["nisse.com", "http://google.com"]);
    });

    it("cy.ntlmSso with port in ntlmHosts shall not succeed", function () {
      expectFail(
        "Invalid host [nisse.com:8080] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
      );
      cy.ntlmSso(["nisse.com:8080", "google.com"]);
    });

    it("cy.ntlmSso with path in ntlmHosts shall not succeed", function () {
      expectFail(
        "Invalid host [nisse.com/test] in ntlmHosts, must be only a hostname or FQDN (localhost or www.google.com is ok, https://www.google.com:443/search is not ok). Wildcards are accepted."
      );
      cy.ntlmSso(["nisse.com/test", "google.com"]);
    });

    it("cy.ntlmSso with non array for ntlmHosts shall not succeed", function () {
      expectFail("Invalid ntlmHosts, must be an array.");
      cy.ntlmSso({ nosse: "lapp" });
    });

    it("cy.ntlmSso with undefined for ntlmHosts shall not succeed", function () {
      expectFail("Incomplete configuration. ntlmHosts is an required field.");
      cy.ntlmSso(undefined);
    });

    it("cy.ntlmSso with on non windows shall not succeed", function () {
      if (osSupported()) {
        this.skip();
      }
      expectFail(
        "Body: SSO config parse error. SSO is not supported on this platform. Only Windows OSs are supported."
      );
      cy.ntlmSso(["nisse.com", "google.com"]);
    });
  });

  function expectFail(errorMessage) {
    cy.once("fail", (err) => {
      expect(err.message).to.contain(errorMessage);
    });
  }
});
