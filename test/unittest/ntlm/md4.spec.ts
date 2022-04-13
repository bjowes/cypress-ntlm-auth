import assert from "assert";
import { md4 } from "../../../src/ntlm/md4";

// Test cases from RFC 1320

describe("MD4", function () {
  it("Empty", function () {
    const res = md4(Buffer.from(""));
    assert.equal("31d6cfe0d16ae931b73c59d7e0c089c0", res.toString("hex"));
  });

  it("a", function () {
    const res = md4(Buffer.from("a"));
    assert.equal("bde52cb31de33e46245e05fbdbd6fb24", res.toString("hex"));
  });

  it("abc", function () {
    const res = md4(Buffer.from("abc"));
    assert.equal("a448017aaf21d8525fc10ae87aa6729d", res.toString("hex"));
  });

  it("message digest", function () {
    const res = md4(Buffer.from("message digest"));
    assert.equal("d9130a8164549fe818874806e1c7014b", res.toString("hex"));
  });

  it("abcdefghijklmnopqrstuvwxyz", function () {
    const res = md4(Buffer.from("abcdefghijklmnopqrstuvwxyz"));
    assert.equal("d79e1c308aa5bbcdeea8ed63df412da9", res.toString("hex"));
  });

  it("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", function () {
    const res = md4(
      Buffer.from(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
      )
    );
    assert.equal("043f8582f241db351ce627e153e7f0e4", res.toString("hex"));
  });

  it("12345678901234567890123456789012345678901234567890123456789012345678901234567890", function () {
    const res = md4(
      Buffer.from(
        "12345678901234567890123456789012345678901234567890123456789012345678901234567890"
      )
    );
    assert.equal("e33b4ddc9c38f2199c3e7b164fcc0536", res.toString("hex"));
  });
});
