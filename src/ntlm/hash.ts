import crypto from "crypto";
import { md4 } from "./md4";
import CryptoJS from "crypto-js";
import { Type2Message } from "./type2.message";

/**
 * Hash utilities for NTLM
 */
export class Hash {
  /**
   * Create LM response
   * @param challenge Challenge buffer
   * @param lmhash LM hash buffer
   * @returns LM response
   */
  static createLMResponse(challenge: Buffer, lmhash: Buffer) {
    const buf = Buffer.alloc(24);
    const pwBuffer = Buffer.alloc(21).fill(0);

    lmhash.copy(pwBuffer);

    Hash.calculateDES(pwBuffer.slice(0, 7), challenge).copy(buf);
    Hash.calculateDES(pwBuffer.slice(7, 14), challenge).copy(buf, 8);
    Hash.calculateDES(pwBuffer.slice(14), challenge).copy(buf, 16);

    return buf;
  }

  /**
   * Create LM hash
   * @param password password 
   * @returns LM hash
   */
  static createLMHash(password: string) {
    const buf = Buffer.alloc(16);
    const pwBuffer = Buffer.alloc(14);
    const magicKey = Buffer.from("KGS!@#$%", "ascii");

    if (password.length > 14) {
      buf.fill(0);
      return buf;
    }

    pwBuffer.fill(0);
    pwBuffer.write(password.toUpperCase(), 0, "ascii");

    return Buffer.concat([
      Hash.calculateDES(pwBuffer.slice(0, 7), magicKey),
      Hash.calculateDES(pwBuffer.slice(7), magicKey),
    ]);
  }

  private static calculateDES(key: Buffer, message: Buffer) {
    const desKey = Buffer.alloc(8);

    desKey[0] = key[0] & 0xfe;
    desKey[1] = ((key[0] << 7) & 0xff) | (key[1] >> 1);
    desKey[2] = ((key[1] << 6) & 0xff) | (key[2] >> 2);
    desKey[3] = ((key[2] << 5) & 0xff) | (key[3] >> 3);
    desKey[4] = ((key[3] << 4) & 0xff) | (key[4] >> 4);
    desKey[5] = ((key[4] << 3) & 0xff) | (key[5] >> 5);
    desKey[6] = ((key[5] << 2) & 0xff) | (key[6] >> 6);
    desKey[7] = (key[6] << 1) & 0xff;

    for (let i = 0; i < 8; i++) {
      let parity = 0;

      for (let j = 1; j < 8; j++) {
        parity += (desKey[i] >> j) % 2;
      }

      desKey[i] |= parity % 2 === 0 ? 1 : 0;
    }

    const des = CryptoJS.DES.encrypt(
      CryptoJS.enc.Base64.parse(message.toString("base64")),
      CryptoJS.enc.Base64.parse(desKey.toString("base64")),
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    // cipher-js returns a larger encrypted buffer than expected, slice to message length
    return Buffer.from(des.toString(), "base64").slice(0, message.length);
  }

  /**
   * Create NTLM response
   * @param challenge Challenge buffer
   * @param ntlmhash NTLM hash buffer
   * @returns NTLM Response
   */
  static createNTLMResponse(challenge: Buffer, ntlmhash: Buffer) {
    const buf = Buffer.alloc(24);
    const ntlmBuffer = Buffer.alloc(21).fill(0);

    ntlmhash.copy(ntlmBuffer);

    Hash.calculateDES(ntlmBuffer.slice(0, 7), challenge).copy(buf);
    Hash.calculateDES(ntlmBuffer.slice(7, 14), challenge).copy(buf, 8);
    Hash.calculateDES(ntlmBuffer.slice(14), challenge).copy(buf, 16);

    return buf;
  }

  /**
   * Create NTLM hash
   * @param password password
   * @returns NTLM hash
   */
  static createNTLMHash(password: string) {
    return md4(Buffer.from(password, "ucs2"));
  }

  private static createNTLMv2Hash(
    ntlmhash: Buffer,
    username: string,
    authTargetName: string
  ) {
    const hmac = crypto.createHmac("md5", ntlmhash);
    hmac.update(Buffer.from(username.toUpperCase() + authTargetName, "ucs2")); // lgtm[js/weak-cryptographic-algorithm]
    return hmac.digest();
  }

  /**
   * Create LMv2 response
   * @param type2message NTLM Type 2 message
   * @param username username
   * @param authTargetName target domain
   * @param ntlmhash NTLM hash buffer
   * @param nonce nonce
   * @returns LMv2 response
   */
  static createLMv2Response(
    type2message: Type2Message,
    username: string,
    authTargetName: string,
    ntlmhash: Buffer,
    nonce: string
  ) {
    const buf = Buffer.alloc(24);
    const ntlm2hash = Hash.createNTLMv2Hash(ntlmhash, username, authTargetName);
    const hmac = crypto.createHmac("md5", ntlm2hash);

    // server challenge
    type2message.challenge.copy(buf, 8);

    // client nonce
    buf.write(nonce, 16, "hex");

    // create hash
    hmac.update(buf.slice(8));
    const hashedBuffer = hmac.digest();

    hashedBuffer.copy(buf);

    return buf;
  }

  /**
   * Create NTLMv2 response
   * @param type2message NTLM type 2 message
   * @param username username
   * @param authTargetName target domain
   * @param ntlmhash NTLM hash buffer
   * @param nonce Nonce
   * @param timestamp Timestamp
   * @param withMic use MIC
   * @returns NTLMv2 response
   */
  static createNTLMv2Response(
    type2message: Type2Message,
    username: string,
    authTargetName: string,
    ntlmhash: Buffer,
    nonce: string,
    timestamp: string,
    withMic: boolean
  ) {
    let bufferSize = 48 + type2message.targetInfo.buffer.length;
    if (withMic) {
      bufferSize += 8;
    }
    const buf = Buffer.alloc(bufferSize);
    const ntlm2hash = Hash.createNTLMv2Hash(ntlmhash, username, authTargetName);
    const hmac = crypto.createHmac("md5", ntlm2hash);

    // the first 8 bytes are spare to store the hashed value before the blob

    // server challenge
    type2message.challenge.copy(buf, 8);

    // blob signature
    buf.writeUInt32BE(0x01010000, 16);

    // reserved
    buf.writeUInt32LE(0, 20);

    // timestamp
    const timestampLow = Number(
      "0x" + timestamp.substring(Math.max(0, timestamp.length - 8))
    );
    const timestampHigh = Number(
      "0x" + timestamp.substring(0, Math.max(0, timestamp.length - 8))
    );

    buf.writeUInt32LE(timestampLow, 24);
    buf.writeUInt32LE(timestampHigh, 28);

    // random client nonce
    buf.write(nonce, 32, "hex");

    // zero
    buf.writeUInt32LE(0, 40);

    // complete target information block from type 2 message
    type2message.targetInfo.buffer.copy(buf, 44);

    let bufferPos = 44 + type2message.targetInfo.buffer.length;
    if (withMic) {
      // Should include MIC in response, indicate it in AV_FLAGS
      buf.writeUInt16LE(0x06, bufferPos - 4);
      buf.writeUInt16LE(0x04, bufferPos - 2);
      buf.writeUInt32LE(0x02, bufferPos);
      // Write new endblock
      buf.writeUInt32LE(0, bufferPos + 4);
      bufferPos += 8;
    }

    // zero
    buf.writeUInt32LE(0, bufferPos);

    hmac.update(buf.slice(8));
    const hashedBuffer = hmac.digest();

    hashedBuffer.copy(buf);

    return buf;
  }

  /**
   * Create MIC
   * @param type1message NTLM type 1 message
   * @param type2message NTLM type 2 message
   * @param type3message NTLM type 3 message
   * @param username username
   * @param authTargetName target domain
   * @param ntlmhash NTLM hash buffer
   * @param nonce Nonce
   * @param timestamp Timestamp
   * @returns MIC buffer
   */
  static createMIC(
    type1message: Buffer,
    type2message: Type2Message,
    type3message: Buffer,
    username: string,
    authTargetName: string,
    ntlmhash: Buffer,
    nonce: string,
    timestamp: string
  ) {
    const ntlm2hash = Hash.createNTLMv2Hash(ntlmhash, username, authTargetName);
    const ntlm2response = Hash.createNTLMv2Response(
      type2message,
      username,
      authTargetName,
      ntlmhash,
      nonce,
      timestamp,
      true
    );
    let hmac = crypto.createHmac("md5", ntlm2hash);
    const sessionBaseKey = hmac.update(ntlm2response.slice(0, 16)).digest();
    const keyExchangeKey = sessionBaseKey;
    // create MIC hash
    hmac = crypto.createHmac("md5", keyExchangeKey);
    hmac.update(type1message);
    hmac.update(type2message.raw);
    hmac.update(type3message);
    const hashedBuffer = hmac.digest();
    return hashedBuffer;
  }

  /**
   * Create random session key
   * @param type2message NTLM type 2 message
   * @param username username
   * @param authTargetName target domain
   * @param ntlmhash NTLM hash buffer
   * @param nonce Nonce
   * @param timestamp Timestamp
   * @param withMic use MIC
   * @returns Random session key buffer
   */
  static createRandomSessionKey(
    type2message: Type2Message,
    username: string,
    authTargetName: string,
    ntlmhash: Buffer,
    nonce: string,
    timestamp: string,
    withMic: boolean
  ) {
    const ntlm2hash = Hash.createNTLMv2Hash(ntlmhash, username, authTargetName);
    const ntlm2response = Hash.createNTLMv2Response(
      type2message,
      username,
      authTargetName,
      ntlmhash,
      nonce,
      timestamp,
      withMic
    );
    const hmac = crypto.createHmac("md5", ntlm2hash);
    const sessionBaseKey = hmac.update(ntlm2response.slice(0, 16)).digest();
    const keyExchangeKey = sessionBaseKey;

    const exportedSessionKeyHex = Hash.createPseudoRandomValue(32);
    const exportedSessionKey = Buffer.from(exportedSessionKeyHex, "hex");
    const rc4 = crypto.createCipheriv("rc4", keyExchangeKey, "");
    const encryptedRandomSessionKey = rc4.update(exportedSessionKey);
    return encryptedRandomSessionKey;
  }

  /**
   * Create pseudo random value
   * @param length length of string to generate
   * @returns pseudo random string
   */
  static createPseudoRandomValue(length: number) {
    let str = "";
    while (str.length < length) {
      str += Math.floor(Math.random() * 16).toString(16);
    }
    return str;
  }

  /**
   * Create timestamp
   * @returns Timestamp
   */
  static createTimestamp() {
    // TODO: we are loosing precision here since js is not able to handle those large integers
    // maybe think about a different solution here
    // 11644473600000 = diff between 1970 and 1601
    return ((Date.now() + 11644473600000) * 10000).toString(16);
  }
}
