/// <reference types="Cypress" />

context("Load test with mixed HTTP/HTTPS hosts", function () {
  const httpHost = "http://localhost:5002";
  const httpsHost = "https://localhost:5003";
  const httpNtlmHost = "http://localhost:5000";
  const httpsNtlmHost = "https://localhost:5001";

  beforeEach("Reset NTLM config", function () {
    cy.ntlmReset();
  });

  it("100 NTLM HTTP GET requests", function () {
    cy.ntlm(httpNtlmHost, "nisse", "manpower", "mpatst");
    let iteration = 100;
    while (iteration--) {
      let id = iteration;
      cy.request({
        method: "GET",
        url: httpNtlmHost + "/api/get" + "?id=" + id,
      }).should((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property("id", id.toString());
      });
    }
  });

  it("100 NTLM HTTP POST requests", function () {
    cy.ntlm(httpNtlmHost, "nisse", "manpower", "mpatst");

    let iteration = 100;
    while (iteration--) {
      let body = {
        ntlmHost: "https://my.test.host/" + iteration,
      };

      cy.request({
        method: "POST",
        url: httpNtlmHost + "/api/post",
        body: body,
      }).should((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property("ntlmHost", body.ntlmHost);
        expect(response.body).to.have.property("reply", "OK ÅÄÖéß");
      });
    }
  });

  it("HTTP page with 100 random API calls", function () {
    cy.ntlm(httpNtlmHost, "nisse", "manpower", "mpatst");
    cy.ntlm(httpsNtlmHost, "nisse", "manpower", "mpatst");
    cy.visit(httpHost + "/load-test.html");
  });

  it("Authenticated HTTP page with 100 random API calls", function () {
    cy.ntlm(httpNtlmHost, "nisse", "manpower", "mpatst");
    cy.ntlm(httpsNtlmHost, "nisse", "manpower", "mpatst");
    cy.visit(httpNtlmHost + "/load-test.html");
  });

  it("HTTPS page with 100 random API calls", function () {
    cy.ntlm(httpNtlmHost, "nisse", "manpower", "mpatst");
    cy.ntlm(httpsNtlmHost, "nisse", "manpower", "mpatst");
    cy.visit(httpsHost + "/load-test.html");
  });

  it("Authenticated HTTPS page with 100 random API calls", function () {
    cy.ntlm(httpNtlmHost, "nisse", "manpower", "mpatst");
    cy.ntlm(httpsNtlmHost, "nisse", "manpower", "mpatst");
    cy.visit(httpsNtlmHost + "/load-test.html");
  });
});
