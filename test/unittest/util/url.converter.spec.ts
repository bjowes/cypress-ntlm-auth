// cSpell:ignore nisse, manpwr, mptest, testpc

import { toCompleteUrl } from "../../../src/util/url.converter";

describe("urlConverter", function () {
  describe("toCompleteUrl", function () {
    it("should throw for null url", function () {
      // Act
      expect(() => toCompleteUrl(null, false)).toThrow("Could not parse empty host");
    });

    it("should throw for empty url", function () {
      // Act
      expect(() => toCompleteUrl("", false)).toThrow("Could not parse empty host");
    });

    it("should throw for blank url", function () {
      // Act
      expect(() => toCompleteUrl(" ", false)).toThrow("Missing mandatory properties of complete url: ");
    });

    it("should set port from url", function () {
      // Act
      let result = toCompleteUrl("http://localhost:8090/nisse", false);

      // Assert
      expect(result.port).toEqual("8090");
    });

    it("should set default http port from url", function () {
      // Act
      let result = toCompleteUrl("http://localhost/nisse", false);

      // Assert
      expect(result.port).toEqual("80");
    });

    it("should set default https port from url", function () {
      // Act
      let result = toCompleteUrl("https://localhost/nisse", false);

      // Assert
      expect(result.port).toEqual("443");
    });

    it("should set hostname without port from url", function () {
      // Act
      let result = toCompleteUrl("https://localhost/nisse", false);

      // Assert
      expect(result.hostname).toEqual("localhost");
    });

    it("should set hostname without port from url with port", function () {
      // Act
      let result = toCompleteUrl("https://localhost:8080/nisse", false);

      // Assert
      expect(result.hostname).toEqual("localhost");
    });

    it("should set path from url", function () {
      // Act
      let result = toCompleteUrl("http://localhost/nisse/bosse", false);

      // Assert
      expect(result.path).toEqual("/nisse/bosse");
    });

    it("should set path to '/' when missing in url", function () {
      // Act
      let result = toCompleteUrl("http://localhost", false);

      // Assert
      expect(result.path).toEqual("/");
    });

    it("should set path to '/' when set in url", function () {
      // Act
      let result = toCompleteUrl("http://localhost/", false);

      // Assert
      expect(result.path).toEqual("/");
    });

    it("should set path with query from url", function () {
      // Act
      let result = toCompleteUrl("http://localhost/nisse/bosse?olle=pelle&karl=oskar", false);

      // Assert
      expect(result.path).toEqual("/nisse/bosse?olle=pelle&karl=oskar");
    });

    it("should set href to hostname and path for url with path", function () {
      // Act
      let result = toCompleteUrl("http://localhost/nisse/bosse?olle=pelle&karl=oskar", false);

      // Assert
      expect(result.href).toEqual("http://localhost:80/nisse/bosse?olle=pelle&karl=oskar");
    });

    it("should set href to hostname and path for url without path", function () {
      // Act
      let result = toCompleteUrl("http://localhost", false);

      // Assert
      expect(result.href).toEqual("http://localhost:80/");
    });

    it("should set href to hostname and path for url with slash path", function () {
      // Act
      let result = toCompleteUrl("http://localhost/", false);

      // Assert
      expect(result.href).toEqual("http://localhost:80/");
    });

    it("should detect localhost for localhost hostname", function () {
      // Act
      let result = toCompleteUrl("http://localhost/", false);

      // Assert
      expect(result.isLocalhost).toEqual(true);
    });

    it("should detect localhost for 127.0.0.1 hostname", function () {
      // Act
      let result = toCompleteUrl("http://127.0.0.1/", false);

      // Assert
      expect(result.isLocalhost).toEqual(true);
    });

    it("should not detect localhost for 127.0.0.2 hostname", function () {
      // Act
      let result = toCompleteUrl("http://127.0.0.2/", false);

      // Assert
      expect(result.isLocalhost).toEqual(false);
    });

    it("should not detect localhost for google.com hostname", function () {
      // Act
      let result = toCompleteUrl("http://google.com/", false);

      // Assert
      expect(result.isLocalhost).toEqual(false);
    });

    it("should detect http protocol for http url", function () {
      // Act
      let result = toCompleteUrl("http://127.0.0.1/", false);

      // Assert
      expect(result.protocol).toEqual("http:");
    });

    it("should detect https protocol for https url", function () {
      // Act
      let result = toCompleteUrl("https://127.0.0.1/", false);

      // Assert
      expect(result.protocol).toEqual("https:");
    });

    it("should throw if useSSL argument is not set when addProtocol is set", function () {
      // Act
      expect(() => toCompleteUrl("127.0.0.1:80", true)).toThrow(
        "Must specify useSSL parameter when addProtocol is set"
      );
    });

    it("should infer http protocol for url on port 80 when SSL is not forced", function () {
      // Act
      let result = toCompleteUrl("127.0.0.1:80", true, false);

      // Assert
      expect(result.protocol).toEqual("http:");
    });

    it("should infer http protocol for url on port 8080 when SSL is not forced", function () {
      // Act
      let result = toCompleteUrl("127.0.0.1:8080", true, false);

      // Assert
      expect(result.protocol).toEqual("http:");
    });

    it("should infer http protocol for url on port 443 when SSL is not forced", function () {
      // Act
      let result = toCompleteUrl("127.0.0.1:443", true, false);

      // Assert
      expect(result.protocol).toEqual("http:");
    });

    it("should infer https protocol for url on port 80 when SSL is forced", function () {
      // Act
      let result = toCompleteUrl("127.0.0.1:80", true, true);

      // Assert
      expect(result.protocol).toEqual("https:");
    });

    it("should infer https protocol for url on port 8080 when SSL is forced", function () {
      // Act
      let result = toCompleteUrl("127.0.0.1:8080", true, true);

      // Assert
      expect(result.protocol).toEqual("https:");
    });

    it("should infer https protocol for url on port 443 when SSL is forced", function () {
      // Act
      let result = toCompleteUrl("127.0.0.1:443", true, true);

      // Assert
      expect(result.protocol).toEqual("https:");
    });
  });
});
