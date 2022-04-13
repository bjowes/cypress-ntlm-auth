import { TlsCertValidator } from "../../../src/util/tls.cert.validator";
import { ExpressServer } from "../proxy/express.server";
import assert from "assert";
import { osSupported } from "win-sso";

describe("TlsCertValidator", function () {
  let expressServer = new ExpressServer();
  let localhostUrl: URL;
  let badUrl = new URL("http://localhost:0");
  let googleUrl = new URL("https://google.com:443");

  before("Start HttpsServer", async function () {
    this.timeout(30000);
    let expressUrl = await expressServer.startHttpsServer(false, undefined);
    localhostUrl = new URL(expressUrl);
    this.timeout(2000);
  });

  beforeEach("reset connect", function () {
    expressServer.resetConnectCount();
  });

  after("Stop HTTPS server", async function () {
    await expressServer.stopHttpsServer();
  });

  it("should resolve after checking cert by connection to host using TLS", async function () {
    const tlsCertValidator = new TlsCertValidator();
    try {
      await tlsCertValidator.validate(googleUrl);
    } catch (err: any) {
      assert.fail(err);
    }
  });

  it("should reject self signed cert", async function () {
    const tlsCertValidator = new TlsCertValidator();
    try {
      await tlsCertValidator.validate(localhostUrl);
      assert.fail();
    } catch (err: any) {
      assert.equal(1, expressServer.getConnectCount());
      assert.equal("DEPTH_ZERO_SELF_SIGNED_CERT", err.code);
    }
  });

  it("should reject if host does not exist", async function () {
    const tlsCertValidator = new TlsCertValidator();
    try {
      await tlsCertValidator.validate(badUrl);
      assert.fail();
    } catch (err: any) {
      assert.equal(0, expressServer.getConnectCount());
      if (osSupported) {
        assert.ok(["EADDRNOTAVAIL", "ECONNREFUSED"].indexOf(err.code) !== -1);
      }
    }
  });
});
