/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable jsdoc/no-undefined-types */
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD4 Message
 * Digest Algorithm, as defined in RFC 1320.
 * Version 2.1 Copyright (C) Jerrad Pierce, Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*
 * Converted to TypeScript and added Buffer handling
 * Björn Weström 2022
 */

/**
 * Creates a MD4 hash from a buffer
 *
 * @param {Buffer} buf Bytes to hash
 * @returns {Buffer} Computed hash
 */
export function md4(buf: Buffer): Buffer {
  return binl2buf(coreMd4(buf2binl(buf), buf.length * 8));
}

/*
 * Calculate the MD4 of an array of little-endian words, and a bit length
 */
function coreMd4(x: Array<number>, len: number) {
  /* append padding */
  x[len >> 5] |= 0x80 << len % 32;
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;

    a = md4Ff(a, b, c, d, x[i + 0], 3);
    d = md4Ff(d, a, b, c, x[i + 1], 7);
    c = md4Ff(c, d, a, b, x[i + 2], 11);
    b = md4Ff(b, c, d, a, x[i + 3], 19);
    a = md4Ff(a, b, c, d, x[i + 4], 3);
    d = md4Ff(d, a, b, c, x[i + 5], 7);
    c = md4Ff(c, d, a, b, x[i + 6], 11);
    b = md4Ff(b, c, d, a, x[i + 7], 19);
    a = md4Ff(a, b, c, d, x[i + 8], 3);
    d = md4Ff(d, a, b, c, x[i + 9], 7);
    c = md4Ff(c, d, a, b, x[i + 10], 11);
    b = md4Ff(b, c, d, a, x[i + 11], 19);
    a = md4Ff(a, b, c, d, x[i + 12], 3);
    d = md4Ff(d, a, b, c, x[i + 13], 7);
    c = md4Ff(c, d, a, b, x[i + 14], 11);
    b = md4Ff(b, c, d, a, x[i + 15], 19);

    a = md4Gg(a, b, c, d, x[i + 0], 3);
    d = md4Gg(d, a, b, c, x[i + 4], 5);
    c = md4Gg(c, d, a, b, x[i + 8], 9);
    b = md4Gg(b, c, d, a, x[i + 12], 13);
    a = md4Gg(a, b, c, d, x[i + 1], 3);
    d = md4Gg(d, a, b, c, x[i + 5], 5);
    c = md4Gg(c, d, a, b, x[i + 9], 9);
    b = md4Gg(b, c, d, a, x[i + 13], 13);
    a = md4Gg(a, b, c, d, x[i + 2], 3);
    d = md4Gg(d, a, b, c, x[i + 6], 5);
    c = md4Gg(c, d, a, b, x[i + 10], 9);
    b = md4Gg(b, c, d, a, x[i + 14], 13);
    a = md4Gg(a, b, c, d, x[i + 3], 3);
    d = md4Gg(d, a, b, c, x[i + 7], 5);
    c = md4Gg(c, d, a, b, x[i + 11], 9);
    b = md4Gg(b, c, d, a, x[i + 15], 13);

    a = md4Hh(a, b, c, d, x[i + 0], 3);
    d = md4Hh(d, a, b, c, x[i + 8], 9);
    c = md4Hh(c, d, a, b, x[i + 4], 11);
    b = md4Hh(b, c, d, a, x[i + 12], 15);
    a = md4Hh(a, b, c, d, x[i + 2], 3);
    d = md4Hh(d, a, b, c, x[i + 10], 9);
    c = md4Hh(c, d, a, b, x[i + 6], 11);
    b = md4Hh(b, c, d, a, x[i + 14], 15);
    a = md4Hh(a, b, c, d, x[i + 1], 3);
    d = md4Hh(d, a, b, c, x[i + 9], 9);
    c = md4Hh(c, d, a, b, x[i + 5], 11);
    b = md4Hh(b, c, d, a, x[i + 13], 15);
    a = md4Hh(a, b, c, d, x[i + 3], 3);
    d = md4Hh(d, a, b, c, x[i + 11], 9);
    c = md4Hh(c, d, a, b, x[i + 7], 11);
    b = md4Hh(b, c, d, a, x[i + 15], 15);

    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }
  return [a, b, c, d];
}

/*
 * These functions implement the basic operation for each round of the
 * algorithm.
 */
function md4Cmn(
  q: number,
  a: number,
  b: number,
  x: number,
  s: number,
  t: number
) {
  return safeAdd(rol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}
function md4Ff(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number
) {
  return md4Cmn((b & c) | (~b & d), a, 0, x, s, 0);
}
function md4Gg(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number
) {
  return md4Cmn((b & c) | (b & d) | (c & d), a, 0, x, s, 1518500249);
}
function md4Hh(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number
) {
  return md4Cmn(b ^ c ^ d, a, 0, x, s, 1859775393);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safeAdd(x: number, y: number) {
  const lsw = (x & 0xffff) + (y & 0xffff);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xffff);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num: number, cnt: number) {
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert a buffer to an array of little-endian words
 */
function buf2binl(buf: Buffer): Array<number> {
  const bin: Array<number> = [];
  for (let i = 0; i < buf.length * 8; i += 8)
    bin[i >> 5] |= buf[i >> 3] << i % 32;
  return bin;
}

/*
 * Convert an array of little-endian words to a buffer
 */
function binl2buf(bin: Array<number>): Buffer {
  const buf = Buffer.alloc(bin.length * 4);
  for (let i = 0; i < bin.length * 32; i += 8)
    buf[i >> 3] = bin[i >> 5] >>> i % 32;
  return buf;
}
