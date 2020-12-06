// cSpell:ignore nisse, manpwr, mptest, testpc

import chai from "chai";
import { toCompleteUrl } from "../../../src/util/url.converter";

describe("urlConverter", function () {
  describe("toCompleteUrl", function () {
    it("should throw for undefined url", function () {
      // Act
      chai
        .expect(() => toCompleteUrl(undefined, false))
        .to.throw("Could not parse empty host");
    });

    it("should throw for empty url", function () {
      // Act
      chai
        .expect(() => toCompleteUrl("", false))
        .to.throw("Could not parse empty host");
    });

    it("should throw for blank url", function () {
      // Act
      chai
        .expect(() => toCompleteUrl(" ", false))
        .to.throw("Missing mandatory properties of complete url: ");
    });

    it("should set port from url", function () {
      // Act
      let result = toCompleteUrl("http://localhost:8090/nisse", false);

      // Assert
      chai.expect(result.port).to.equal("8090");
    });

    it("should set default http port from url", function () {
      // Act
      let result = toCompleteUrl("http://localhost/nisse", false);

      // Assert
      chai.expect(result.port).to.equal("80");
    });

    it("should set default https port from url", function () {
      // Act
      let result = toCompleteUrl("https://localhost/nisse", false);

      // Assert
      chai.expect(result.port).to.equal("443");
    });

    it("should set hostname without port from url", function () {
      // Act
      let result = toCompleteUrl("https://localhost/nisse", false);

      // Assert
      chai.expect(result.hostname).to.equal("localhost");
    });

    it("should set hostname without port from url with port", function () {
      // Act
      let result = toCompleteUrl("https://localhost:8080/nisse", false);

      // Assert
      chai.expect(result.hostname).to.equal("localhost");
    });

    it("should set path from url", function () {
      // Act
      let result = toCompleteUrl("http://localhost/nisse/bosse", false);

      // Assert
      chai.expect(result.path).to.equal("/nisse/bosse");
    });

    it("should set path to '/' when missing in url", function () {
      // Act
      let result = toCompleteUrl("http://localhost", false);

      // Assert
      chai.expect(result.path).to.equal("/");
    });

    it("should set path to '/' when set in url", function () {
      // Act
      let result = toCompleteUrl("http://localhost/", false);

      // Assert
      chai.expect(result.path).to.equal("/");
    });

    it("should set path with query from url", function () {
      // Act
      let result = toCompleteUrl(
        "http://localhost/nisse/bosse?olle=pelle&karl=oskar",
        false
      );

      // Assert
      chai.expect(result.path).to.equal("/nisse/bosse?olle=pelle&karl=oskar");
    });

    it("should set href to hostname and path for url with path", function () {
      // Act
      let result = toCompleteUrl(
        "http://localhost/nisse/bosse?olle=pelle&karl=oskar",
        false
      );

      // Assert
      chai
        .expect(result.href)
        .to.equal("http://localhost:80/nisse/bosse?olle=pelle&karl=oskar");
    });

    it("should set href to hostname and path for url without path", function () {
      // Act
      let result = toCompleteUrl("http://localhost", false);

      // Assert
      chai.expect(result.href).to.equal("http://localhost:80/");
    });

    it("should set href to hostname and path for url with slash path", function () {
      // Act
      let result = toCompleteUrl("http://localhost/", false);

      // Assert
      chai.expect(result.href).to.equal("http://localhost:80/");
    });

    it("should detect localhost for localhost hostname", function () {
      // Act
      let result = toCompleteUrl("http://localhost/", false);

      // Assert
      chai.expect(result.isLocalhost).to.be.true;
    });

    it("should detect localhost for 127.0.0.1 hostname", function () {
      // Act
      let result = toCompleteUrl("http://127.0.0.1/", false);

      // Assert
      chai.expect(result.isLocalhost).to.be.true;
    });

    it("should not detect localhost for 127.0.0.2 hostname", function () {
      // Act
      let result = toCompleteUrl("http://127.0.0.2/", false);

      // Assert
      chai.expect(result.isLocalhost).to.be.false;
    });

    it("should not detect localhost for google.com hostname", function () {
      // Act
      let result = toCompleteUrl("http://google.com/", false);

      // Assert
      chai.expect(result.isLocalhost).to.be.false;
    });

    it("should detect http protocol for http url", function () {
      // Act
      let result = toCompleteUrl("http://127.0.0.1/", false);

      // Assert
      chai.expect(result.protocol).to.equal("http:");
    });

    it("should detect https protocol for https url", function () {
      // Act
      let result = toCompleteUrl("https://127.0.0.1/", false);

      // Assert
      chai.expect(result.protocol).to.equal("https:");
    });

    it("should throw if useSSL argument is not set when addProtocol is set", function () {
      // Act
      chai
        .expect(() => toCompleteUrl("127.0.0.1:80", true))
        .to.throw("Must specify useSSL parameter when addProtocol is set");
    });

    it("should infer http protocol for url on port 80 when SSL is not forced", function () {
      // Act
      let result = toCompleteUrl("127.0.0.1:80", true, false);

      // Assert
      chai.expect(result.protocol).to.equal("http:");
    });

    it("should infer http protocol for url on port 8080 when SSL is not forced", function () {
      // Act
      let result = toCompleteUrl("127.0.0.1:8080", true, false);

      // Assert
      chai.expect(result.protocol).to.equal("http:");
    });

    it("should infer http protocol for url on port 443 when SSL is not forced", function () {
      // Act
      let result = toCompleteUrl("127.0.0.1:443", true, false);

      // Assert
      chai.expect(result.protocol).to.equal("http:");
    });

    it("should infer https protocol for url on port 80 when SSL is forced", function () {
      // Act
      let result = toCompleteUrl("127.0.0.1:80", true, true);

      // Assert
      chai.expect(result.protocol).to.equal("https:");
    });

    it("should infer https protocol for url on port 8080 when SSL is forced", function () {
      // Act
      let result = toCompleteUrl("127.0.0.1:8080", true, true);

      // Assert
      chai.expect(result.protocol).to.equal("https:");
    });

    it("should infer https protocol for url on port 443 when SSL is forced", function () {
      // Act
      let result = toCompleteUrl("127.0.0.1:443", true, true);

      // Assert
      chai.expect(result.protocol).to.equal("https:");
    });
  });
});
