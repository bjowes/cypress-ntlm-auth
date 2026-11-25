/// <reference types="Cypress" />

const server = require("../support/serverAddress");

context("Proxy websocket on HTTP server", function () {
  beforeEach("Reset NTLM config", function () {
    cy.ntlmReset();
  });

  it("should handle HTTP websocket", function () {
    cy.visit(server.httpHost.origin + "/websocket.html");
    cy.get("button").contains("HTTP WebSocket").click();
    cy.get("#ws-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("contain", "DISCONNECTED");
  });

  it("should handle open HTTP websocket", function () {
    cy.visit(server.httpHost.origin + "/websocket.html");
    cy.get("button").contains("HTTP WebSocket - stay open").click();
    cy.get("#ws-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("not.contain", "DISCONNECTED");
  });

  it.skip("should handle HTTP websocket with NTLM - NOT SUPPORTED", function () {
    cy.ntlm([server.httpNtlmHost.host], "nisse", "manpower", "mpatst");
    cy.visit(server.httpHost.origin + "/websocket.html");
    cy.get("button").contains("HTTP NTLM WebSocket").click();
    cy.get("#ws-ntlm-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("contain", "DISCONNECTED");
  });

  it("should handle HTTPS websocket", function () {
    cy.visit(server.httpHost.origin + "/websocket.html");
    cy.get("button").contains("HTTPS WebSocket").click();
    cy.get("#wss-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("contain", "DISCONNECTED");
  });

  it("should handle open HTTPS websocket", function () {
    cy.visit(server.httpHost.origin + "/websocket.html");
    cy.get("button").contains("HTTPS WebSocket - stay open").click();
    cy.get("#wss-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("not.contain", "DISCONNECTED");
  });

  it.skip("should handle HTTPS websocket with NTLM - NOT SUPPORTED", function () {
    cy.ntlm([server.httpsNtlmHost.host], "nisse", "manpower", "mpatst");
    cy.visit(server.httpHost.origin + "/websocket.html");
    cy.get("button").contains("HTTPS NTLM WebSocket").click();
    cy.get("#wss-ntlm-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("contain", "DISCONNECTED");
  });
});

context("Proxy websocket on HTTPS server", function () {
  beforeEach("Reset NTLM config", function () {
    cy.ntlmReset();
  });

  it("should handle HTTP websocket", function () {
    cy.visit(server.httpsHost.origin + "/websocket.html");
    cy.get("button").contains("HTTP WebSocket").click();
    cy.get("#ws-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("contain", "DISCONNECTED");
  });

  it("should handle open HTTP websocket", function () {
    cy.visit(server.httpsHost.origin + "/websocket.html");
    cy.get("button").contains("HTTP WebSocket - stay open").click();
    cy.get("#ws-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("not.contain", "DISCONNECTED");
  });

  it.skip("should handle HTTP websocket with NTLM - NOT SUPPORTED", function () {
    cy.ntlm([server.httpNtlmHost.host], "nisse", "manpower", "mpatst");
    cy.visit(server.httpsHost.origin + "/websocket.html");
    cy.get("button").contains("HTTP NTLM WebSocket").click();
    cy.get("#ws-ntlm-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("contain", "DISCONNECTED");
  });

  it("should handle HTTPS websocket", function () {
    cy.visit(server.httpsHost.origin + "/websocket.html");
    cy.get("button").contains("HTTPS WebSocket").click();
    cy.get("#wss-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("contain", "DISCONNECTED");
  });

  it("should handle open HTTPS websocket", function () {
    cy.visit(server.httpsHost.origin + "/websocket.html");
    cy.get("button").contains("HTTPS WebSocket - stay open").click();
    cy.get("#wss-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("not.contain", "DISCONNECTED");
  });

  it.skip("should handle HTTPS websocket with NTLM - NOT SUPPORTED", function () {
    cy.ntlm([server.httpsNtlmHost.host], "nisse", "manpower", "mpatst");
    cy.visit(server.httpsHost.origin + "/websocket.html");
    cy.get("button").contains("HTTPS NTLM WebSocket").click();
    cy.get("#wss-ntlm-output")
      .should("contain", "CONNECTED")
      .and("contain", "SENT: WebSocket rocks")
      .and("contain", "RESPONSE: WebSocket rocks")
      .and("contain", "DISCONNECTED");
  });
});
