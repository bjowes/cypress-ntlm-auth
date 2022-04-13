module.exports = {
  httpHost: new URL("http:" + serverAddress() + ":5002"),
  httpsHost: new URL("https:" + serverAddress() + ":5003"),
  httpNtlmHost: new URL("http:" + serverAddress() + ":5000"),
  httpsNtlmHost: new URL("https:" + serverAddress() + ":5001"),
};

function serverAddress() {
  return Cypress.env("E2E_SERVER_ADDRESS") ?? "127.0.0.1";
}
