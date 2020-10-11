/// <reference types="Cypress" />

context("Proxy for HTTP host", function () {
  const httpHost = "http://localhost:5000";
  const httpHostBaseUrl = httpHost + "/api";

  beforeEach("Reset NTLM config", function () {
    cy.ntlmReset();
  });

  it("should handle NTLMv1 authentication for GET requests", function () {
    cy.ntlm(httpHost, "nisse", "manpower", "mpatst", undefined, 1);

    cy.request({
      method: "GET",
      url: httpHostBaseUrl + "/get",
    }).should((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.length.at.least(500);
    });
  });

  it("should handle authentication for GET requests", function () {
    cy.ntlm(httpHost, "nisse", "manpower", "mpatst");

    cy.request({
      method: "GET",
      url: httpHostBaseUrl + "/get",
    }).should((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.length.at.least(500);
    });
  });

  it("should return 401 for unconfigured host on GET requests", function () {
    cy.request({
      method: "GET",
      url: httpHostBaseUrl + "/get",
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.eq(401);
    });
  });

  it("should handle authentication for POST requests", function () {
    cy.ntlm(httpHost, "nisse", "manpower", "mpatst");

    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "POST",
      url: httpHostBaseUrl + "/post",
      body: body,
    }).should((response) => {
      expect(response.status).to.eq(200);
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
      url: httpHostBaseUrl + "/post",
      body: body,
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.eq(401);
    });
  });

  it("should handle authentication for PUT requests", function () {
    cy.ntlm(httpHost, "nisse", "manpower", "mpatst");

    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "PUT",
      url: httpHostBaseUrl + "/put",
      body: body,
    }).should((response) => {
      expect(response.status).to.eq(200);
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
      url: httpHostBaseUrl + "/put",
      body: body,
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.eq(401);
    });
  });

  it("should handle authentication for DELETE requests", function () {
    cy.ntlm(httpHost, "nisse", "manpower", "mpatst");

    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "DELETE",
      url: httpHostBaseUrl + "/delete",
      body: body,
    }).should((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.length.at.least(500);
    });
  });

  it("should return 401 for unconfigured host on DELETE requests", function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "DELETE",
      url: httpHostBaseUrl + "/delete",
      body: body,
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.eq(401);
    });
  });
});

context("Proxy for HTTPS host", function () {
  const httpsHost = "https://localhost:5001";
  const httpsHostBaseUrl = httpsHost + "/api";

  beforeEach("Reset NTLM config", function () {
    cy.ntlmReset();
  });

  it("should handle authentication for GET requests", function () {
    cy.ntlm(httpsHost, "nisse", "manpower", "mpatst");

    cy.request({
      method: "GET",
      url: httpsHostBaseUrl + "/get",
    }).should((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.length.at.least(500);
    });
  });

  it("should return 401 for unconfigured host on GET requests", function () {
    cy.request({
      method: "GET",
      url: httpsHostBaseUrl + "/get",
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.eq(401);
    });
  });

  it("should handle authentication for POST requests", function () {
    cy.ntlm(httpsHost, "nisse", "manpower", "mpatst");

    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "POST",
      url: httpsHostBaseUrl + "/post",
      body: body,
    }).should((response) => {
      expect(response.status).to.eq(200);
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
      url: httpsHostBaseUrl + "/post",
      body: body,
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.eq(401);
    });
  });

  it("should handle authentication for PUT requests", function () {
    cy.ntlm(httpsHost, "nisse", "manpower", "mpatst");

    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "PUT",
      url: httpsHostBaseUrl + "/put",
      body: body,
    }).should((response) => {
      expect(response.status).to.eq(200);
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
      url: httpsHostBaseUrl + "/put",
      body: body,
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.eq(401);
    });
  });

  it("should handle authentication for DELETE requests", function () {
    cy.ntlm(httpsHost, "nisse", "manpower", "mpatst");

    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "DELETE",
      url: httpsHostBaseUrl + "/delete",
      body: body,
    }).should((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.length.at.least(500);
    });
  });

  it("should return 401 for unconfigured host on DELETE requests", function () {
    let body = {
      ntlmHost: "https://my.test.host/",
    };

    cy.request({
      method: "DELETE",
      url: httpsHostBaseUrl + "/delete",
      body: body,
      failOnStatusCode: false,
    }).should((response) => {
      expect(response.status).to.eq(401);
    });
  });
});
