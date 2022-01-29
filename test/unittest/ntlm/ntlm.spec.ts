import "jest";

import { DependencyInjection } from "../../../src/proxy/dependency.injection.js";
import { TYPES } from "../../../src/proxy/dependency.injection.types.js";

import { INtlm } from "../../../src/ntlm/interfaces/i.ntlm.js";

describe("NTLM hashes", function () {
  let dependencyInjection = new DependencyInjection();
  let ntlm: INtlm;

  const hostName = "LightCity";
  const domainName = "Ursa-Minor";
  const user = "Zaphod";
  const password = "Beeblebrox";
  const nonce = "SrvNonce";

  const NTLMv1asciiType1 = "NTLM TlRMTVNTUAABAAAAgoIAAgAAAAAoAAAAAAAAACgAAAAKALpHAAAADw==";
  const NTLMv1asciiType1withDomainAndWS =
    "NTLM TlRMTVNTUAABAAAAgrIAAgoACgAoAAAACQAJADIAAAAKALpHAAAAD1VSU0EtTUlOT1JMSUdIVENJVFk=";

  const NTLMv2asciiType1 = "NTLM TlRMTVNTUAABAAAAAoAIAgAAAAAoAAAAAAAAACgAAAAKALpHAAAADw==";
  const NTLMv2asciiType1withDomainAndWS =
    "NTLM TlRMTVNTUAABAAAAArAIAgoACgAoAAAACQAJADIAAAAKALpHAAAAD1VSU0EtTUlOT1JMSUdIVENJVFk=";

  const NTLMv1asciiType2 =
    "NTLM TlRMTVNTUAACAAAACgAKADgAAAAGAoECU3J2Tm9uY2UAAAAAAAAAABwAHABCAAAACgC6RwAAAA9VUlNBLU1JTk9SAgAUAFUAUgBTAEEALQBNAEkATgBPAFIAAAAAAA==";
  const NTLMv1ucsType2 =
    "NTLM TlRMTVNTUAACAAAAFAAUADgAAAAFAoECU3J2Tm9uY2UAAAAAAAAAABwAHABMAAAACgC6RwAAAA9VAFIAUwBBAC0ATQBJAE4ATwBSAAIAFABVAFIAUwBBAC0ATQBJAE4ATwBSAAAAAAA=";

  const NTLMv2asciiType2 =
    "NTLM TlRMTVNTUAACAAAACgAKADgAAAAGAIkCU3J2Tm9uY2UAAAAAAAAAABwAHABCAAAACgC6RwAAAA9VUlNBLU1JTk9SAgAUAFUAUgBTAEEALQBNAEkATgBPAFIAAAAAAA==";
  const NTLMv2ucsType2 =
    "NTLM TlRMTVNTUAACAAAAFAAUADgAAAAFAIkCU3J2Tm9uY2UAAAAAAAAAABwAHABMAAAACgC6RwAAAA9VAFIAUwBBAC0ATQBJAE4ATwBSAAIAFABVAFIAUwBBAC0ATQBJAE4ATwBSAAAAAAA=";

  const NTLMv2asciiType2withFullTargetInfo =
    "NTLM TlRMTVNTUAACAAAACgAKADgAAAAGAIkCU3J2Tm9uY2UAAAAAAAAAAJYAlgBCAAAACgC6RwAAAA9VUlNBLU1JTk9SAQAQAE0ATwBTAEkAUwBMAEUAWQACABQAVQBSAFMAQQAtAE0ASQBOAE8AUgADACYATQBvAHMASQBzAGwAZQB5AC4AdQByAHMAYQAuAG0AaQBuAG8AcgAEABQAdQByAHMAYQAuAG0AaQBuAG8AcgAFABQAdQByAHMAYQAuAG0AaQBuAG8AcgAHAAgApS8jGTAw1QEAAAAA";
  const NTLMv2ucsType2withFullTargetInfo =
    "NTLM TlRMTVNTUAACAAAAFAAUADgAAAAFAIkCU3J2Tm9uY2UAAAAAAAAAAJYAlgBMAAAACgC6RwAAAA9VAFIAUwBBAC0ATQBJAE4ATwBSAAEAEABNAE8AUwBJAFMATABFAFkAAgAUAFUAUgBTAEEALQBNAEkATgBPAFIAAwAmAE0AbwBzAEkAcwBsAGUAeQAuAHUAcgBzAGEALgBtAGkAbgBvAHIABAAUAHUAcgBzAGEALgBtAGkAbgBvAHIABQAUAHUAcgBzAGEALgBtAGkAbgBvAHIABwAIAKUvIxkwMNUBAAAAAA==";

  const NTLMv1asciiType3 =
    "NTLM TlRMTVNTUAADAAAAGAAYAGEAAAAYABgAeQAAAAoACgBIAAAABgAGAFIAAAAJAAkAWAAAAAAAAACRAAAABgKBAgoAukcAAAAPVVJTQS1NSU5PUlphcGhvZExJR0hUQ0lUWa2Hym3v40aFucQ8R3qMQtYAZn1okufol+DgDeMQShvyBT8Hx92oLTxImumJ4bAA0w==";
  const NTLMv1ucsType3 =
    "NTLM TlRMTVNTUAADAAAAGAAYAHoAAAAYABgAkgAAABQAFABIAAAADAAMAFwAAAASABIAaAAAAAAAAACqAAAABQKBAgoAukcAAAAPVQBSAFMAQQAtAE0ASQBOAE8AUgBaAGEAcABoAG8AZABMAEkARwBIAFQAQwBJAFQAWQCth8pt7+NGhbnEPEd6jELWAGZ9aJLn6Jfg4A3jEEob8gU/B8fdqC08SJrpieGwANM=";

  const NTLMv2asciiType3 =
    "NTLM TlRMTVNTUAADAAAAGAAYAGEAAABMAEwAeQAAAAoACgBIAAAABgAGAFIAAAAJAAkAWAAAAAAAAADFAAAABgCJAgoAukcAAAAPVVJTQS1NSU5PUlphcGhvZExJR0hUQ0lUWUGK1NLCBoOaRFumGONF595DbGlOb25jZQYFglpeybeFqvRixghlZ4UBAQAAAAAAAIBkkc+qdmAQQ2xpTm9uY2UAAAAAAgAUAFUAUgBTAEEALQBNAEkATgBPAFIAAAAAAAAAAAA=";
  const NTLMv2ucsType3 =
    "NTLM TlRMTVNTUAADAAAAGAAYAHoAAABMAEwAkgAAABQAFABIAAAADAAMAFwAAAASABIAaAAAAAAAAADeAAAABQCJAgoAukcAAAAPVQBSAFMAQQAtAE0ASQBOAE8AUgBaAGEAcABoAG8AZABMAEkARwBIAFQAQwBJAFQAWQBBitTSwgaDmkRbphjjRefeQ2xpTm9uY2UGBYJaXsm3har0YsYIZWeFAQEAAAAAAACAZJHPqnZgEENsaU5vbmNlAAAAAAIAFABVAFIAUwBBAC0ATQBJAE4ATwBSAAAAAAAAAAAA";

  const NTLMv2asciiType3withFullTargetInfo =
    "NTLM TlRMTVNTUAADAAAAGAAYAHEAAADOAM4AiQAAAAoACgBYAAAABgAGAGIAAAAJAAkAaAAAAAAAAABXAQAABgCJAgoAukcAAAAP2fjzqJY/7wxEYeR28AGdg1VSU0EtTUlOT1JaYXBob2RMSUdIVENJVFkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADXhZHgC0fgPJIzov16QnSMAQEAAAAAAAClLyMZMDDVAUNsaU5vbmNlAAAAAAEAEABNAE8AUwBJAFMATABFAFkAAgAUAFUAUgBTAEEALQBNAEkATgBPAFIAAwAmAE0AbwBzAEkAcwBsAGUAeQAuAHUAcgBzAGEALgBtAGkAbgBvAHIABAAUAHUAcgBzAGEALgBtAGkAbgBvAHIABQAUAHUAcgBzAGEALgBtAGkAbgBvAHIABwAIAKUvIxkwMNUBBgAEAAIAAAAAAAAAAAAAAA==";
  const NTLMv2ucsType3withFullTargetInfo =
    "NTLM TlRMTVNTUAADAAAAGAAYAIoAAADOAM4AogAAABQAFABYAAAADAAMAGwAAAASABIAeAAAAAAAAABwAQAABQCJAgoAukcAAAAPZMtzZqis7BLo0lsLULi+9FUAUgBTAEEALQBNAEkATgBPAFIAWgBhAHAAaABvAGQATABJAEcASABUAEMASQBUAFkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA14WR4AtH4DySM6L9ekJ0jAEBAAAAAAAApS8jGTAw1QFDbGlOb25jZQAAAAABABAATQBPAFMASQBTAEwARQBZAAIAFABVAFIAUwBBAC0ATQBJAE4ATwBSAAMAJgBNAG8AcwBJAHMAbABlAHkALgB1AHIAcwBhAC4AbQBpAG4AbwByAAQAFAB1AHIAcwBhAC4AbQBpAG4AbwByAAUAFAB1AHIAcwBhAC4AbQBpAG4AbwByAAcACAClLyMZMDDVAQYABAACAAAAAAAAAAAAAAA=";

  beforeEach(function () {
    ntlm = dependencyInjection.get<INtlm>(TYPES.INtlm);
  });

  it("should create expected Type 1 message. NTLMv1 ASCII", function () {
    const type1 = ntlm.createType1Message(1, "", "");
    expect(type1.header()).toEqual(NTLMv1asciiType1);
  });

  it("should create expected Type 1 message. NTLMv1 ASCII with domain and workstation", function () {
    const type1 = ntlm.createType1Message(1, hostName.toUpperCase(), domainName.toUpperCase());
    expect(type1.header()).toEqual(NTLMv1asciiType1withDomainAndWS);
  });

  it("should create expected Type 1 message. NTLMv2 ASCII", function () {
    const type1 = ntlm.createType1Message(2, "", "");
    expect(type1.header()).toEqual(NTLMv2asciiType1);
  });

  it("should create expected Type 1 message. NTLMv2 ASCII with domain and workstation", function () {
    const type1 = ntlm.createType1Message(2, hostName.toUpperCase(), domainName.toUpperCase());
    expect(type1.header()).toEqual(NTLMv2asciiType1withDomainAndWS);
  });

  it("should decode Type 2 message. NTLMv1 ASCII", function () {
    const type2 = ntlm.decodeType2Message(NTLMv1asciiType2);
    // ["Negotiate OEM", "Request Target", "Negotiate NTLM", "Target Type Domain", "Negotiate Target Info", "Negotiate Version"]
    expect(type2.flags).toEqual(0x02810206);
    expect(type2.version).toEqual(1);
    expect(type2.encoding).toEqual("ascii");
    expect(type2.targetInfo.parsed["DOMAIN"]).toEqual(domainName.toUpperCase());
    expect(type2.targetInfo.parsed["SERVER_TIMESTAMP"]).toBeUndefined();
    expect(type2.challenge.toString("ascii")).toEqual(nonce);
  });

  it("should decode Type 2 message. NTLMv1 UCS2", function () {
    const type2 = ntlm.decodeType2Message(NTLMv1ucsType2);
    // ["Negotiate Unicode", "Request Target", "Negotiate NTLM", "Target Type Domain", "Negotiate Target Info", "Negotiate Version"]
    expect(type2.flags).toEqual(0x02810205);
    expect(type2.version).toEqual(1);
    expect(type2.encoding).toEqual("ucs2");
    expect(type2.targetInfo.parsed["DOMAIN"]).toEqual(domainName.toUpperCase());
    expect(type2.targetInfo.parsed["SERVER_TIMESTAMP"]).toBeUndefined();
    expect(type2.challenge.toString("ascii")).toEqual(nonce);
  });

  it("should decode Type 2 message. NTLMv2 ASCII", function () {
    const type2 = ntlm.decodeType2Message(NTLMv2asciiType2);
    // ["Negotiate OEM", "Request Target", "Target Type Domain", "Negotiate NTLM2 Key", "Negotiate Target Info", "Negotiate Version"]
    expect(type2.flags).toEqual(0x02890006);
    expect(type2.version).toEqual(2);
    expect(type2.encoding).toEqual("ascii");
    expect(type2.targetInfo.parsed["DOMAIN"]).toEqual(domainName.toUpperCase());
    expect(type2.targetInfo.parsed["SERVER_TIMESTAMP"]).toBeUndefined();
    expect(type2.challenge.toString("ascii")).toEqual(nonce);
  });

  it("should decode Type 2 message. NTLMv2 UCS2", function () {
    const type2 = ntlm.decodeType2Message(NTLMv2ucsType2);
    // ["Negotiate Unicode", "Request Target", "Target Type Domain", "Negotiate NTLM2 Key", "Negotiate Target Info", "Negotiate Version"]
    expect(type2.flags).toEqual(0x02890005);
    expect(type2.version).toEqual(2);
    expect(type2.encoding).toEqual("ucs2");
    expect(type2.targetInfo.parsed["DOMAIN"]).toEqual(domainName.toUpperCase());
    expect(type2.targetInfo.parsed["SERVER_TIMESTAMP"]).toBeUndefined();
    expect(type2.challenge.toString("ascii")).toEqual(nonce);
  });

  it("should decode Type 2 message. NTLMv2 ASCII with full target info", function () {
    const type2 = ntlm.decodeType2Message(NTLMv2asciiType2withFullTargetInfo);
    // ["Negotiate OEM", "Request Target", "Target Type Domain", "Negotiate NTLM2 Key", "Negotiate Target Info", "Negotiate Version"]
    expect(type2.flags).toEqual(0x02890006);
    expect(type2.version).toEqual(2);
    expect(type2.encoding).toEqual("ascii");
    expect(type2.targetInfo.parsed["DOMAIN"]).toEqual(domainName.toUpperCase());
    expect(type2.targetInfo.parsed["SERVER_TIMESTAMP"]).not.toBeUndefined();
    expect(type2.challenge.toString("ascii")).toEqual(nonce);
  });

  it("should decode Type 2 message. NTLMv2 UCS2 with full target info", function () {
    const type2 = ntlm.decodeType2Message(NTLMv2ucsType2withFullTargetInfo);
    // ["Negotiate Unicode", "Request Target", "Target Type Domain", "Negotiate NTLM2 Key", "Negotiate Target Info", "Negotiate Version"]
    expect(type2.flags).toEqual(0x02890005);
    expect(type2.version).toEqual(2);
    expect(type2.encoding).toEqual("ucs2");
    expect(type2.targetInfo.parsed["DOMAIN"]).toEqual(domainName.toUpperCase());
    expect(type2.targetInfo.parsed["SERVER_TIMESTAMP"]).not.toBeUndefined();
    expect(type2.challenge.toString("ascii")).toEqual(nonce);
  });

  it("should create expected Type 3 message. NTLMv1 ASCII", function () {
    const type1 = ntlm.createType1Message(1, hostName.toUpperCase(), domainName.toUpperCase());
    const type2 = ntlm.decodeType2Message(NTLMv1asciiType2);
    const type3 = ntlm.createType3Message(
      type1,
      type2,
      user,
      password,
      hostName.toUpperCase(),
      domainName.toUpperCase(),
      undefined,
      undefined
    );
    expect(type3.header()).toEqual(NTLMv1asciiType3);
  });

  it("should create expected Type 3 message. NTLMv1 UCS2", function () {
    const type1 = ntlm.createType1Message(1, hostName.toUpperCase(), domainName.toUpperCase());
    const type2 = ntlm.decodeType2Message(NTLMv1ucsType2);
    const type3 = ntlm.createType3Message(
      type1,
      type2,
      user,
      password,
      hostName.toUpperCase(),
      domainName.toUpperCase(),
      undefined,
      undefined
    );
    expect(type3.header()).toEqual(NTLMv1ucsType3);
  });

  it("should create expected Type 3 message. NTLMv2 ASCII", function () {
    const type1 = ntlm.createType1Message(2, hostName.toUpperCase(), domainName.toUpperCase());
    const type2 = ntlm.decodeType2Message(NTLMv2asciiType2);
    // Since the client nonce and timestamp are generated by the client, we have
    // to force usage of the actual values from our expected answer (which was generated by another the python ntlm-auth client)
    let buf = Buffer.from(NTLMv2asciiType3.substring(5), "base64");
    let timestamp_index = 121 + 16 + 8;
    let timestamp = buf.readUInt32LE(timestamp_index + 4).toString(16) + buf.readUInt32LE(timestamp_index).toString(16);
    let client_nonce = buf.slice(timestamp_index + 8, timestamp_index + 16).toString("hex");
    const type3 = ntlm.createType3Message(
      type1,
      type2,
      user,
      password,
      hostName.toUpperCase(),
      domainName.toUpperCase(),
      client_nonce,
      timestamp
    );
    expect(type3.header()).toEqual(NTLMv2asciiType3);
  });

  it("should create expected Type 3 message. NTLMv2 UCS2", function () {
    const type1 = ntlm.createType1Message(2, hostName.toUpperCase(), domainName.toUpperCase());
    const type2 = ntlm.decodeType2Message(NTLMv2ucsType2);
    // Since the client nonce and timestamp are generated by the client, we have
    // to force usage of the actual values from our expected answer (which was generated by another the python ntlm-auth client)
    let buf = Buffer.from(NTLMv2ucsType3.substring(5), "base64");
    let timestamp_index = 146 + 16 + 8;
    let timestamp = buf.readUInt32LE(timestamp_index + 4).toString(16) + buf.readUInt32LE(timestamp_index).toString(16);
    let client_nonce = buf.slice(timestamp_index + 8, timestamp_index + 16).toString("hex");
    const type3 = ntlm.createType3Message(
      type1,
      type2,
      user,
      password,
      hostName.toUpperCase(),
      domainName.toUpperCase(),
      client_nonce,
      timestamp
    );
    expect(type3.header()).toEqual(NTLMv2ucsType3);
  });

  it("should create expected Type 3 message. NTLMv2 ASCII with full target info", function () {
    const type1 = ntlm.createType1Message(2, hostName.toUpperCase(), domainName.toUpperCase());
    const type2 = ntlm.decodeType2Message(NTLMv2asciiType2withFullTargetInfo);
    // Since the client nonce is generated by the client, we have
    // to force usage of the actual values from our expected answer (which was generated by another the python ntlm-auth client)
    let buf = Buffer.from(NTLMv2asciiType3withFullTargetInfo.substring(5), "base64");
    let timestamp_index = 137 + 16 + 8;
    let client_nonce = buf.slice(timestamp_index + 8, timestamp_index + 16).toString("hex");
    const type3 = ntlm.createType3Message(
      type1,
      type2,
      user,
      password,
      hostName.toUpperCase(),
      domainName.toUpperCase(),
      client_nonce,
      undefined
    );
    expect(type3.header()).toEqual(NTLMv2asciiType3withFullTargetInfo);
  });

  it("should create expected Type 3 message. NTLMv2 UCS2 with full target info", function () {
    const type1 = ntlm.createType1Message(2, hostName.toUpperCase(), domainName.toUpperCase());
    const type2 = ntlm.decodeType2Message(NTLMv2ucsType2withFullTargetInfo);
    // Since the client nonce is generated by the client, we have
    // to force usage of the actual values from our expected answer (which was generated by another the python ntlm-auth client)
    let buf = Buffer.from(NTLMv2ucsType3withFullTargetInfo.substring(5), "base64");
    let timestamp_index = 162 + 16 + 8;
    let client_nonce = buf.slice(timestamp_index + 8, timestamp_index + 16).toString("hex");
    const type3 = ntlm.createType3Message(
      type1,
      type2,
      user,
      password,
      hostName.toUpperCase(),
      domainName.toUpperCase(),
      client_nonce,
      undefined
    );
    expect(type3.header()).toEqual(NTLMv2ucsType3withFullTargetInfo);
  });
});
