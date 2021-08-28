import { expect } from "chai";
import { CompleteUrl } from "../../../src/models/complete.url.model";
import { TlsCertValidator } from "../../../src/util/tls.cert.validator";
import { ExpressServer } from "../proxy/express.server";
import { toCompleteUrl } from "../../../src/util/url.converter";
import { fail } from "assert";
import { osSupported } from "win-sso";

describe("TlsCertValidator", function () {
  let expressServer = new ExpressServer();
  let localhostUrl: CompleteUrl;
  let badUrl = { hostname: "localhost", port: "0" } as CompleteUrl;
  let googleUrl = { hostname: "google.com", port: "443" } as CompleteUrl;

  before("Start HttpsServer", async function () {
    this.timeout(30000);
    let expressUrl = await expressServer.startHttpsServer(false, undefined);
    localhostUrl = toCompleteUrl(expressUrl, false, true);
    this.timeout(2000);
  });

  beforeEach("reset connect", function () {
    expressServer.resetConnectCount();
  });

  after("Stop HTTPS server", async function () {
    await expressServer.stopHttpsServer();
  });

  it("should resolve after checking cert by connection to host using TLS", async function () {
    var tlsCertValidator = new TlsCertValidator();
    try {
      await tlsCertValidator.validate(googleUrl);
    } catch (err: any) {
      fail(err);
    }
  });

  it("should reject self signed cert", async function () {
    var tlsCertValidator = new TlsCertValidator();
    try {
      await tlsCertValidator.validate(localhostUrl);
      fail();
    } catch (err: any) {
      expect(expressServer.getConnectCount()).to.eq(1);
      expect(err.code).to.eq("DEPTH_ZERO_SELF_SIGNED_CERT");
    }
  });

  it("should reject if host does not exist", async function () {
    var tlsCertValidator = new TlsCertValidator();
    try {
      await tlsCertValidator.validate(badUrl);
      fail();
    } catch (err: any) {
      expect(expressServer.getConnectCount()).to.eq(0);
      if (osSupported) {
        expect(["EADDRNOTAVAIL", "ECONNREFUSED"]).to.contain(err.code);
      }
    }
  });
});
