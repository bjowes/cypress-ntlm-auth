const cypressNtlmAuth = require("../../../src/index");

import chai from "chai";

describe("Execute as node module", function () {
  describe("run", function () {
    // Only this negative test is possible here. Positive tests are
    it("should fail since cypress isn't installed", async function () {
      // Arrange
      let cypressOptions = {
        baseUrl: "http://localhost:5000",
        video: false,
        spec: "./cypress/integration/config.spec.js",
      };

      // Act
      await chai
        .expect(cypressNtlmAuth.run(cypressOptions))
        .to.be.rejectedWith(
          "cypress-ntlm-auth requires Cypress to be installed."
        );
    });
  });
});
