import 'mocha';
const ntlm = require('../../src/ntlm/ntlm');
import { expect } from 'chai';

describe('NTLM hashes', function () {
  const hostName = 'LightCity';
  const domainName = 'Ursa-Minor';
  const user = 'Zaphod';
  const password = 'Beeblebrox';
  const nonce = 'SrvNonce';

  const NTLMv1and2asciiType1 = 'NTLM TlRMTVNTUAABAAAAAoIIAAAAAAAoAAAAAAAAACgAAAAKALpHAAAADw==';
  const NTLMv1and2asciiType1withDomainAndWS = 'NTLM TlRMTVNTUAABAAAAArIIAAoACgAoAAAACQAJADIAAAAKALpHAAAAD1VSU0EtTUlOT1JMSUdIVENJVFk=';

  const NTLMv1asciiType2 = 'NTLM TlRMTVNTUAACAAAACgAKADgAAAAGAoEAU3J2Tm9uY2UAAAAAAAAAABIAEgBCAAAAAAAAAAAAAABVUlNBLU1JTk9SAgAKAFVSU0EtTUlOT1IAAAAA';
  const NTLMv1ucsType2 = 'NTLM TlRMTVNTUAACAAAAFAAUADgAAAAFAoEAU3J2Tm9uY2UAAAAAAAAAABwAHABMAAAACgC6RwAAAA9VAFIAUwBBAC0ATQBJAE4ATwBSAAIAFABVAFIAUwBBAC0ATQBJAE4ATwBSAAAAAAA=';
  const NTLMv2asciiType2 = 'NTLM TlRMTVNTUAACAAAACgAKADgAAAAGAokAU3J2Tm9uY2UAAAAAAAAAABIAEgBCAAAAAAAAAAAAAABVUlNBLU1JTk9SAgAKAFVSU0EtTUlOT1IAAAAA';
  const NTLMv2ucsType2 = 'NTLM TlRMTVNTUAACAAAAFAAUADgAAAAFAokAU3J2Tm9uY2UAAAAAAAAAABwAHABMAAAACgC6RwAAAA9VAFIAUwBBAC0ATQBJAE4ATwBSAAIAFABVAFIAUwBBAC0ATQBJAE4ATwBSAAAAAAA=';

  const NTLMv1asciiType3 = 'NTLM TlRMTVNTUAADAAAAGAAYAGEAAAAYABgAeQAAAAoACgBIAAAABgAGAFIAAAAJAAkAWAAAAAAAAACRAAAABgKBAAoAukcAAAAPVVJTQS1NSU5PUlphcGhvZExJR0hUQ0lUWa2Hym3v40aFucQ8R3qMQtYAZn1okufol+DgDeMQShvyBT8Hx92oLTxImumJ4bAA0w==';
  const NTLMv1ucsType3 = 'NTLM TlRMTVNTUAADAAAAGAAYAHoAAAAYABgAkgAAABQAFABIAAAADAAMAFwAAAASABIAaAAAAAAAAACqAAAABQKBAAoAukcAAAAPVQBSAFMAQQAtAE0ASQBOAE8AUgBaAGEAcABoAG8AZABMAEkARwBIAFQAQwBJAFQAWQCth8pt7+NGhbnEPEd6jELWAGZ9aJLn6Jfg4A3jEEob8gU/B8fdqC08SJrpieGwANM=';
  const NTLMv2asciiType3 = 'NTLM TlRMTVNTUAADAAAAGAAYAGEAAABCAEIAeQAAAAoACgBIAAAABgAGAFIAAAAJAAkAWAAAAAAAAAC7AAAABgKJAAoAukcAAAAPVVJTQS1NSU5PUlphcGhvZExJR0hUQ0lUWcDQfcnb4jj7hkcC1xqO6OME+GgaGzli7EgneRPkqWAYlRBbth1JxdkBAQAAAAAAAIAsPMAJbmAQBPhoGhs5YuwAAAAAAgAKAFVSU0EtTUlOT1IAAAAAAAAAAA==';
  const NTLMv2ucsType3 = 'NTLM TlRMTVNTUAADAAAAGAAYAHoAAABMAEwAkgAAABQAFABIAAAADAAMAFwAAAASABIAaAAAAAAAAADeAAAABQKJAAoAukcAAAAPVQBSAFMAQQAtAE0ASQBOAE8AUgBaAGEAcABoAG8AZABMAEkARwBIAFQAQwBJAFQAWQBK511LvqRN9pu4nqXtMq/rCzjt4dTrB70dBfQgyj7flereVlW0w1LiAQEAAAAAAAAARfwTDW5gEAs47eHU6we9AAAAAAIAFABVAFIAUwBBAC0ATQBJAE4ATwBSAAAAAAAAAAAA';

  it('should create expected Type 1 message. NTLMv1 or NTLMv2 ASCII', function () {
    const type1 = ntlm.createType1Message();
    expect(type1).to.be.equal(NTLMv1and2asciiType1);
  });

  it('should create expected Type 1 message with domain and workstation', function () {
    const type1 = ntlm.createType1Message(hostName.toUpperCase(), domainName.toUpperCase());
    expect(type1).to.be.equal(NTLMv1and2asciiType1withDomainAndWS);
  });

  it('should decode Type 2 message. NTLMv1 ASCII', function () {
    const type2 = ntlm.decodeType2Message(NTLMv1asciiType2);
    // ["Negotiate OEM", "Request Target", "Negotiate NTLM", "Target Type Domain", "Negotiate Target Info"]
    expect(type2.flags).to.be.equal(0x810206);
    expect(type2.version).to.be.equal(1);
    expect(type2.encoding).to.be.equal('ascii');
    expect(type2.challenge.toString('ascii')).to.be.equal(nonce);
  });

  it('should decode Type 2 message. NTLMv1 UCS2', function () {
    const type2 = ntlm.decodeType2Message(NTLMv1ucsType2);
    // ["Negotiate Unicode", "Request Target", "Negotiate NTLM", "Target Type Domain", "Negotiate Target Info"]
    expect(type2.flags).to.be.equal(0x810205);
    expect(type2.version).to.be.equal(1);
    expect(type2.encoding).to.be.equal('ucs2');
    expect(type2.challenge.toString('ascii')).to.be.equal(nonce);
  });

  it('should decode Type 2 message. NTLMv2 ASCII', function () {
    const type2 = ntlm.decodeType2Message(NTLMv2asciiType2);
    // ["Negotiate OEM", "Request Target", "Negotiate NTLM", "Target Type Domain", "Negotiate NTLM2 Key", "Negotiate Target Info"]
    expect(type2.flags).to.be.equal(0x890206);
    expect(type2.version).to.be.equal(2);
    expect(type2.encoding).to.be.equal('ascii');
    expect(type2.challenge.toString('ascii')).to.be.equal(nonce);
  });

  it('should decode Type 2 message. NTLMv2 UCS2', function () {
    const type2 = ntlm.decodeType2Message(NTLMv2ucsType2);
    // ["Negotiate Unicode", "Request Target", "Negotiate NTLM", "Target Type Domain", "Negotiate NTLM2 Key", "Negotiate Target Info"]
    expect(type2.flags).to.be.equal(0x890205);
    expect(type2.version).to.be.equal(2);
    expect(type2.encoding).to.be.equal('ucs2');
    expect(type2.challenge.toString('ascii')).to.be.equal(nonce);
  });

  it('should create expected Type 3 message. NTLMv1 ASCII', function () {
    const type2 = ntlm.decodeType2Message(NTLMv1asciiType2);
    const type3 = ntlm.createType3Message(type2, user, password, hostName.toUpperCase(), domainName.toUpperCase());
    expect(type3).to.be.equal(NTLMv1asciiType3);
  });

  it('should create expected Type 3 message. NTLMv1 UCS2', function () {
    const type2 = ntlm.decodeType2Message(NTLMv1ucsType2);
    const type3 = ntlm.createType3Message(type2, user, password, hostName.toUpperCase(), domainName.toUpperCase());
    expect(type3).to.be.equal(NTLMv1ucsType3);
  });

  it('should create expected Type 3 message. NTLMv2 ASCII', function () {
    const type2 = ntlm.decodeType2Message(NTLMv2asciiType2);
    // Since the client nonce and timestamp are generated by the client, we have
    // to force usage of the actual values from our expected answer (which was generated by another the python ntlm-auth client)
    let buf = Buffer.from(NTLMv2asciiType3.substring(5), 'base64');
    let timestamp_index = 121+16+8;
    let timestamp = buf.slice(timestamp_index,timestamp_index+8).readBigUInt64LE().toString(16);
    let client_nonce = buf.slice(timestamp_index+8,timestamp_index+16).toString('hex');
    const type3 = ntlm.createType3Message(type2, user, password, hostName.toUpperCase(), domainName.toUpperCase(), client_nonce, timestamp);
    expect(type3).to.be.equal(NTLMv2asciiType3);
  });

  it('should create expected Type 3 message. NTLMv2 UCS2', function () {
    const type2 = ntlm.decodeType2Message(NTLMv2ucsType2);
    // Since the client nonce and timestamp are generated by the client, we have
    // to force usage of the actual values from our expected answer (which was generated by another the python ntlm-auth client)
    let buf = Buffer.from(NTLMv2ucsType3.substring(5), 'base64');
    let timestamp_index = 146+16+8;
    let timestamp = buf.slice(timestamp_index,timestamp_index+8).readBigUInt64LE().toString(16);
    let client_nonce = buf.slice(timestamp_index+8,timestamp_index+16).toString('hex');
    const type3 = ntlm.createType3Message(type2, user, password, hostName.toUpperCase(), domainName.toUpperCase(), client_nonce, timestamp);
    expect(type3).to.be.equal(NTLMv2ucsType3);
  });

});
