/// <reference types="Cypress" />

context("Proxy for HTTP websocket", function () {
  const httpHost = "http://localhost:5002";
  const httpsHost = "https://localhost:5003";
  const httpNtlmHost = "http://localhost:5000";
  const httpsNtlmHost = "https://localhost:5001";

  beforeEach("Reset NTLM config", function () {
    cy.ntlmReset();
  });

  it("should handle HTTP websocket", function () {
    cy.visit(httpHost + "/websocket.html");
    cy.get("button").contains("HTTP WebSocket").click();
    cy.get("#ws-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("contain", "DISCONNECTED");
  });

  it.skip("should handle HTTP websocket with NTLM - NOT SUPPORTED", function () {
    cy.ntlm(httpNtlmHost, "nisse", "manpower", "mpatst");
    cy.visit(httpHost + "/websocket.html");
    cy.get("button").contains("HTTP NTLM WebSocket").click();
    cy.get("#ws-ntlm-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("contain", "DISCONNECTED");
  });

  it("should handle HTTPS websocket", function () {
    cy.visit(httpHost + "/websocket.html");
    cy.get("button").contains("HTTPS WebSocket").click();
    cy.get("#wss-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("contain", "DISCONNECTED");
  });

  it.skip("should handle HTTPS websocket with NTLM - NOT SUPPORTED", function () {
    cy.ntlm(httpsNtlmHost, "nisse", "manpower", "mpatst");
    cy.visit(httpHost + "/websocket.html");
    cy.get("button").contains("HTTPS NTLM WebSocket").click();
    cy.get("#wss-ntlm-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("contain", "DISCONNECTED");
  });
});
