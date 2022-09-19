/// <reference types="Cypress" />

const server = require("../support/serverAddress");

context("Load test with mixed HTTP/HTTPS hosts", function () {
  beforeEach("Reset NTLM config", function () {
    cy.ntlmReset();
  });

  context("NTLM authentication", function () {
    it("100 HTTP GET requests", function () {
      let iteration = 100;
      while (iteration--) {
        const id = iteration;
        cy.request({
          method: "GET",
          url: server.httpHost.origin + "/api/get" + "?id=" + id,
        }).should((response) => {
          expect(response.status).to.equal(200);
          console.log(response.body);
          expect(response.body).to.have.property("id", id.toString());
        });
      }
    });

    it("100 NTLM HTTP GET requests", function () {
      cy.ntlm([server.httpNtlmHost.host], "nisse", "manpower", "mpatst");
      let iteration = 100;
      while (iteration--) {
        const id = iteration;
        cy.request({
          method: "GET",
          url: server.httpNtlmHost.origin + "/api/get" + "?id=" + id,
        }).should((response) => {
          expect(response.status).to.equal(200);
          console.log(response.body);
          expect(response.body).to.have.property("id", id.toString());
        });
      }
    });

    it("100 NTLM HTTP POST requests", function () {
      cy.ntlm([server.httpNtlmHost.host], "nisse", "manpower", "mpatst");

      let iteration = 100;
      while (iteration--) {
        const body = {
          ntlmHost: "https://my.test.host/" + iteration,
        };

        cy.request({
          method: "POST",
          url: server.httpNtlmHost.origin + "/api/post",
          body: body,
        }).should((response) => {
          expect(response.status).to.equal(200);
          expect(response.body).to.have.property("ntlmHost", body.ntlmHost);
          expect(response.body).to.have.property("reply", "OK ÅÄÖéß");
        });
      }
    });

    it("HTTP page with 100 random API calls", function () {
      cy.ntlm(
        [server.httpNtlmHost.host, server.httpsNtlmHost.host],
        "nisse",
        "manpower",
        "mpatst"
      );
      cy.visit(server.httpHost.origin + "/load-test.html");
      cy.get("#error-count", { timeout: 20000 }).should(
        "contain.text",
        "No errors!"
      );
    });

    it("Authenticated HTTP page with 100 random API calls", function () {
      cy.ntlm(
        [server.httpNtlmHost.host, server.httpsNtlmHost.host],
        "nisse",
        "manpower",
        "mpatst"
      );
      cy.visit(server.httpNtlmHost.origin + "/load-test.html");
      cy.get("#error-count", { timeout: 20000 }).should(
        "contain.text",
        "No errors!"
      );
    });

    it("HTTPS page with 100 random API calls", function () {
      cy.ntlm(
        [server.httpNtlmHost.host, server.httpsNtlmHost.host],
        "nisse",
        "manpower",
        "mpatst"
      );
      cy.visit(server.httpsHost.origin + "/load-test.html");
      cy.get("#error-count", { timeout: 20000 }).should(
        "contain.text",
        "No errors!"
      );
    });

    it("Authenticated HTTPS page with 100 random API calls", function () {
      cy.ntlm(
        [server.httpNtlmHost.host, server.httpsNtlmHost.host],
        "nisse",
        "manpower",
        "mpatst"
      );
      cy.visit(server.httpsNtlmHost.origin + "/load-test.html");
      cy.get("#error-count", { timeout: 20000 }).should(
        "contain.text",
        "No errors!"
      );
    });
  });

  context("SSO authentication (win32 only)", function () {
    before("Check platform", function () {
      if (Cypress.platform !== "win32") {
        this.skip();
      }
    });

    it("HTTP page with 100 random API calls", function () {
      cy.ntlmSso([server.httpNtlmHost.hostname]);
      cy.visit(server.httpHost.origin + "/load-test.html");
      cy.get("#error-count", { timeout: 20000 }).should(
        "contain.text",
        "No errors!"
      );
    });

    it("Authenticated HTTP page with 100 random API calls", function () {
      cy.ntlmSso([server.httpNtlmHost.hostname]);
      cy.visit(server.httpNtlmHost.origin + "/load-test.html");
      cy.get("#error-count", { timeout: 20000 }).should(
        "contain.text",
        "No errors!"
      );
    });

    it("HTTPS page with 100 random API calls", function () {
      cy.ntlmSso([server.httpNtlmHost.hostname]);
      cy.visit(server.httpsHost.origin + "/load-test.html");
      cy.get("#error-count", { timeout: 20000 }).should(
        "contain.text",
        "No errors!"
      );
    });

    it("Authenticated HTTPS page with 100 random API calls", function () {
      cy.ntlmSso([server.httpNtlmHost.hostname]);
      cy.visit(server.httpsNtlmHost.origin + "/load-test.html");
      cy.get("#error-count", { timeout: 20000 }).should(
        "contain.text",
        "No errors!"
      );
    });
  });
});
