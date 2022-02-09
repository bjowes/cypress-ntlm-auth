/// <reference types="Cypress" />

context("Load test with mixed HTTP/HTTPS hosts", function () {
  const httpHost = new URL("http://localhost:5002");
  const httpsHost = new URL("https://localhost:5003");
  const httpNtlmHost = new URL("http://localhost:5000");
  const httpsNtlmHost = new URL("https://localhost:5001");

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
          url: httpHost.origin + "/api/get" + "?id=" + id,
        }).should((response) => {
          expect(response.status).to.equal(200);
          console.log(response.body);
          expect(response.body).to.have.property("id", id.toString());
        });
      }
    });

    it("100 NTLM HTTP GET requests", function () {
      cy.ntlm([httpNtlmHost.host], "nisse", "manpower", "mpatst");
      let iteration = 100;
      while (iteration--) {
        const id = iteration;
        cy.request({
          method: "GET",
          url: httpNtlmHost.origin + "/api/get" + "?id=" + id,
        }).should((response) => {
          expect(response.status).to.equal(200);
          console.log(response.body);
          expect(response.body).to.have.property("id", id.toString());
        });
      }
    });

    it("100 NTLM HTTP POST requests", function () {
      cy.ntlm([httpNtlmHost.host], "nisse", "manpower", "mpatst");

      let iteration = 100;
      while (iteration--) {
        const body = {
          ntlmHost: "https://my.test.host/" + iteration,
        };

        cy.request({
          method: "POST",
          url: httpNtlmHost.origin + "/api/post",
          body: body,
        }).should((response) => {
          expect(response.status).to.equal(200);
          expect(response.body).to.have.property("ntlmHost", body.ntlmHost);
          expect(response.body).to.have.property("reply", "OK ÅÄÖéß");
        });
      }
    });

    it("HTTP page with 100 random API calls", function () {
      cy.ntlm([httpNtlmHost.host, httpsNtlmHost.host], "nisse", "manpower", "mpatst");
      cy.visit(httpHost.origin + "/load-test.html");
      cy.get("#error-count").should("contain.text", "No errors!");
    });

    it("Authenticated HTTP page with 100 random API calls", function () {
      cy.ntlm([httpNtlmHost.host, httpsNtlmHost.host], "nisse", "manpower", "mpatst");
      cy.visit(httpNtlmHost.origin + "/load-test.html");
      cy.get("#error-count").should("contain.text", "No errors!");
    });

    it("HTTPS page with 100 random API calls", function () {
      cy.ntlm([httpNtlmHost.host, httpsNtlmHost.host], "nisse", "manpower", "mpatst");
      cy.visit(httpsHost.origin + "/load-test.html");
      cy.get("#error-count").should("contain.text", "No errors!");
    });

    it("Authenticated HTTPS page with 100 random API calls", function () {
      cy.ntlm([httpNtlmHost.host, httpsNtlmHost.host], "nisse", "manpower", "mpatst");
      cy.visit(httpsNtlmHost.origin + "/load-test.html");
      cy.get("#error-count").should("contain.text", "No errors!");
    });
  });

  context("SSO authentication (win32 only)", function () {
    before("Check platform", function () {
      if (Cypress.platform !== "win32") {
        this.skip();
      }
    });

    it("HTTP page with 100 random API calls", function () {
      cy.ntlmSso([httpNtlmHost.hostname]);
      cy.visit(httpHost.origin + "/load-test.html");
      cy.get("#error-count").should("contain.text", "No errors!");
    });

    it("Authenticated HTTP page with 100 random API calls", function () {
      cy.ntlmSso([httpNtlmHost.hostname]);
      cy.visit(httpNtlmHost.origin + "/load-test.html");
      cy.get("#error-count").should("contain.text", "No errors!");
    });

    it("HTTPS page with 100 random API calls", function () {
      cy.ntlmSso([httpNtlmHost.hostname]);
      cy.visit(httpsHost.origin + "/load-test.html");
      cy.get("#error-count").should("contain.text", "No errors!");
    });

    it("Authenticated HTTPS page with 100 random API calls", function () {
      cy.ntlmSso([httpNtlmHost.hostname]);
      cy.visit(httpsNtlmHost.origin + "/load-test.html");
      cy.get("#error-count").should("contain.text", "No errors!");
    });
  });
});
