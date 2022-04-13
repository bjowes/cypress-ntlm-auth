/// <reference types="Cypress" />

const server = require("../support/serverAddress");

context("Proxy for HTTP NTLM host", function () {
  beforeEach("Reset NTLM config", function () {
    cy.ntlmReset();
  });

  it("should handle NTLMv1 authentication for GET requests", function () {
    cy.ntlm(
      [server.httpNtlmHost.host],
      "nisse",
      "manpower",
      "mpatst",
      undefined,
      1
    );

    cy.request({
      method: "GET",
      url: server.httpNtlmHost.origin + "/api" + "/get",
    }).should((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.have.length.at.least(500);
    });
  });

  it("should handle authentication for GET requests", function () {
    cy.ntlm([server.httpNtlmHost.host], "nisse", "manpower", "mpatst");

    cy.request({
      method: "GET",
      url: server.httpNtlmHost.origin + "/api" + "/get",
    }).should((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.have.length.at.least(500);
    });
  });

  it("should return 401 for unconfigured host on GET requests", function () {
    cy.request({
      method: "GET",
      url: server.httpNtlmHost.origin + "/api" + "/get",
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.equal(401);
    });
  });

  it("should handle authentication for POST requests", function () {
    cy.ntlm([server.httpNtlmHost.host], "nisse", "manpower", "mpatst");

    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "POST",
      url: server.httpNtlmHost.origin + "/api" + "/post",
      body: body,
    }).should((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property(
        "ntlmHost",
        "https://my.test.host/"
      );
      expect(response.body).to.have.property("reply", "OK ÅÄÖéß");
    });
  });

  it("should return 401 for unconfigured host on POST requests", function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "POST",
      url: server.httpNtlmHost.origin + "/api" + "/post",
      body: body,
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.equal(401);
    });
  });

  it("should handle authentication for PUT requests", function () {
    cy.ntlm([server.httpNtlmHost.host], "nisse", "manpower", "mpatst");

    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "PUT",
      url: server.httpNtlmHost.origin + "/api" + "/put",
      body: body,
    }).should((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property(
        "ntlmHost",
        "https://my.test.host/"
      );
      expect(response.body).to.have.property("reply", "OK ÅÄÖéß");
    });
  });

  it("should return 401 for unconfigured host on PUT requests", function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "PUT",
      url: server.httpNtlmHost.origin + "/api" + "/put",
      body: body,
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.equal(401);
    });
  });

  it("should handle authentication for DELETE requests", function () {
    cy.ntlm([server.httpNtlmHost.host], "nisse", "manpower", "mpatst");

    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "DELETE",
      url: server.httpNtlmHost.origin + "/api" + "/delete",
      body: body,
    }).should((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.have.length.at.least(500);
    });
  });

  it("should return 401 for unconfigured host on DELETE requests", function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "DELETE",
      url: server.httpNtlmHost.origin + "/api" + "/delete",
      body: body,
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.equal(401);
    });
  });
});

context("Proxy for HTTPS NTLM host", function () {
  beforeEach("Reset NTLM config", function () {
    cy.ntlmReset();
  });

  it("should handle authentication for GET requests", function () {
    cy.ntlm([server.httpsNtlmHost.host], "nisse", "manpower", "mpatst");

    cy.request({
      method: "GET",
      url: server.httpsNtlmHost.origin + "/api" + "/get",
    }).should((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.have.length.at.least(500);
    });
  });

  it("should return 401 for unconfigured host on GET requests", function () {
    cy.request({
      method: "GET",
      url: server.httpsNtlmHost.origin + "/api" + "/get",
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.equal(401);
    });
  });

  it("should handle authentication for POST requests", function () {
    cy.ntlm([server.httpsNtlmHost.host], "nisse", "manpower", "mpatst");

    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "POST",
      url: server.httpsNtlmHost.origin + "/api" + "/post",
      body: body,
    }).should((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property(
        "ntlmHost",
        "https://my.test.host/"
      );
      expect(response.body).to.have.property("reply", "OK ÅÄÖéß");
    });
  });

  it("should return 401 for unconfigured host on POST requests", function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "POST",
      url: server.httpsNtlmHost.origin + "/api" + "/post",
      body: body,
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.equal(401);
    });
  });

  it("should handle authentication for PUT requests", function () {
    cy.ntlm([server.httpsNtlmHost.host], "nisse", "manpower", "mpatst");

    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "PUT",
      url: server.httpsNtlmHost.origin + "/api" + "/put",
      body: body,
    }).should((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property(
        "ntlmHost",
        "https://my.test.host/"
      );
      expect(response.body).to.have.property("reply", "OK ÅÄÖéß");
    });
  });

  it("should return 401 for unconfigured host on PUT requests", function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "PUT",
      url: server.httpsNtlmHost.origin + "/api" + "/put",
      body: body,
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.equal(401);
    });
  });

  it("should handle authentication for DELETE requests", function () {
    cy.ntlm([server.httpsNtlmHost.host], "nisse", "manpower", "mpatst");

    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "DELETE",
      url: server.httpsNtlmHost.origin + "/api" + "/delete",
      body: body,
    }).should((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.have.length.at.least(500);
    });
  });

  it("should return 401 for unconfigured host on DELETE requests", function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "DELETE",
      url: server.httpsNtlmHost.origin + "/api" + "/delete",
      body: body,
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.equal(401);
    });
  });
});
