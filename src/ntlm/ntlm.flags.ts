/* eslint-disable no-unused-vars */
"use strict";

export enum NtlmFlags {
  /* Indicates that Unicode strings are supported for use in security buffer
     data. */
  NEGOTIATE_UNICODE = 1 << 0,

  /* Indicates that OEM strings are supported for use in security buffer data. */
  NEGOTIATE_OEM = 1 << 1,

  /* Requests that the server's authentication realm be included in the Type 2
     message. */
  REQUEST_TARGET = 1 << 2,

  /* unknown (1<<3) */

  /* Specifies that authenticated communication between the client and server
     should carry a digital signature (message integrity). */
  NEGOTIATE_SIGN = 1 << 4,

  /* Specifies that authenticated communication between the client and server
     should be encrypted (message confidentiality). */
  NEGOTIATE_SEAL = 1 << 5,

  /* Indicates that datagram authentication is being used. */
  NEGOTIATE_DATAGRAM_STYLE = 1 << 6,

  /* Indicates that the LAN Manager session key should be used for signing and
     sealing authenticated communications. */
  NEGOTIATE_LM_KEY = 1 << 7,

  /* unknown purpose */
  NEGOTIATE_NETWARE = 1 << 8,

  /* Indicates that NTLM authentication is being used. */
  NEGOTIATE_NTLM_KEY = 1 << 9,

  /* unknown (1<<10) */

  /* Sent by the client in the Type 3 message to indicate that an anonymous
     context has been established. This also affects the response fields. */
  NEGOTIATE_ANONYMOUS = 1 << 11,

  /* Sent by the client in the Type 1 message to indicate that a desired
     authentication realm is included in the message. */
  NEGOTIATE_DOMAIN_SUPPLIED = 1 << 12,

  /* Sent by the client in the Type 1 message to indicate that the client
     workstation's name is included in the message. */
  NEGOTIATE_WORKSTATION_SUPPLIED = 1 << 13,

  /* Sent by the server to indicate that the server and client are on the same
     machine. Implies that the client may use a pre-established local security
     context rather than responding to the challenge. */
  NEGOTIATE_LOCAL_CALL = 1 << 14,

  /* Indicates that authenticated communication between the client and server
     should be signed with a "dummy" signature. */
  NEGOTIATE_ALWAYS_SIGN = 1 << 15,

  /* Sent by the server in the Type 2 message to indicate that the target
     authentication realm is a domain. */
  TARGET_TYPE_DOMAIN = 1 << 16,

  /* Sent by the server in the Type 2 message to indicate that the target
     authentication realm is a server. */
  TARGET_TYPE_SERVER = 1 << 17,

  /* Sent by the server in the Type 2 message to indicate that the target
     authentication realm is a share. Presumably, this is for share-level
     authentication. Usage is unclear. */
  TARGET_TYPE_SHARE = 1 << 18,

  /* Indicates that the NTLM2 signing and sealing scheme should be used for
     protecting authenticated communications. */
  NEGOTIATE_NTLM2_KEY = 1 << 19,

  /* unknown purpose */
  REQUEST_INIT_RESPONSE = 1 << 20,

  /* unknown purpose */
  REQUEST_ACCEPT_RESPONSE = 1 << 21,

  /* unknown purpose */
  REQUEST_NONNT_SESSION_KEY = 1 << 22,

  /* Sent by the client in the Type 1 message to request Target info block from server.
     Sent by the server in the Type 2 message to indicate that it is including a
     Target Information block in the message. */
  NEGOTIATE_TARGET_INFO = 1 << 23,

  /* unknown (1<24) */

  /* Indicates that the version info block is included in the message */
  NEGOTIATE_VERSION = 1 << 25,

  /* unknown (1<26) */
  /* unknown (1<27) */
  /* unknown (1<28) */

  /* Indicates that 128-bit encryption is supported. */
  NEGOTIATE_128 = 1 << 29,

  /* Indicates that the client will provide an encrypted master key in
     the "Session Key" field of the Type 3 message. */
  NEGOTIATE_KEY_EXCHANGE = 1 << 30,

  /* Indicates that 56-bit encryption is supported. */
  NEGOTIATE_56 = 1 << 31,
}
