#!/usr/bin/env python

## Decodes NTLM "Authenticate" HTTP-Header blobs.
## Reads the raw blob from stdin; prints out the contained metadata.
## Supports (auto-detects) Type 1, Type 2, and Type 3 messages.
## Based on the excellent protocol description from:
##  <http://davenport.sourceforge.net/ntlm.html>
## with additional detail subsequently added from the official protocol spec:
##  <http://msdn.microsoft.com/en-us/library/cc236621.aspx>
##
## For example:
##
##   $ echo "TlRMTVNTUAABAAAABYIIAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAwAAAA" | ./ntlmdecoder.py
##   Found NTLMSSP header
##   Msg Type: 1 (Request)
##   Domain: '' [] (0b @0)
##   Workstation: '' [] (0b @0)
##   OS Ver: '????0???'
##   Flags: 0x88205 ["Negotiate Unicode", "Request Target", "Negotiate NTLM", "Negotiate Always Sign", "Negotiate NTLM2 Key"]
##

import sys
import base64
import struct
import string
import collections
from ntlm_auth.ntlm import NtlmContext
import hexdump

NTLMSSP_NEGOTIATE_56 = 0x80000000
NTLMSSP_NEGOTIATE_KEY_EXCH = 0x40000000
NTLMSSP_NEGOTIATE_128 = 0x20000000
NTLMSSP_NEGOTIATE_VERSION = 0x02000000
NTLMSSP_NEGOTIATE_TARGET_INFO = 0x00800000
NTLMSSP_NEGOTIATE_SEAL = 0x00000020
NTLMSSP_NEGOTIATE_SIGN = 0x00000010
NTLMSSP_NEGOTIATE_UCS2 = 0x00000001
NTLMSSP_NEGOTIATE_OEM = 0x00000002
NTLMSSP_REQUEST_TARGET = 0x00000004
NTLMSSP_NEGOTIATE_NTLM = 0x00000200
NTLMSSP_NEGOTIATE_ALWAYS_SIGN = 0x00008000
NTLMSSP_TARGET_TYPE_DOMAIN = 0x00010000
NTLMSSP_NEGOTIATE_NTLM2_KEY = 0x00080000
NTLMSSP_NEGOTIATE_TARGET_INFO = 0x00800000

W10_VERSION = struct.pack('<B', 10) + struct.pack('<B', 0) + struct.pack('<H', 18362) + struct.pack('<B', 0) + struct.pack('<B', 0) + struct.pack('<B', 0) + struct.pack('<B', 15)

def generate_type1(username, password, auth_domain, workstation, ntlm_version):

  print "Generating T1 NTLM version", ntlm_version, "headers for user:", username, "pass:", password, "auth_domain:", auth_domain, "ws:", workstation

  if auth_domain is not None:
    auth_domain = auth_domain.upper()
  if workstation is not None:
    workstation = workstation.upper()

  if ntlm_version == 1:
    ntlm_context = NtlmContext(username, password, auth_domain, workstation, ntlm_compatibility=0)
  elif ntlm_version == 0:
    ntlm_context = NtlmContext(username, password, auth_domain, workstation, ntlm_compatibility=1)
  else:
    ntlm_context = NtlmContext(username, password, auth_domain, workstation, None, ntlm_compatibility=3)

  negotiate_message = ntlm_context.step()
  unpacked = struct.unpack('<I', negotiate_message[12:16])
  flags = unpacked[0]
  # Remove flags we don't send
  flags -= NTLMSSP_NEGOTIATE_56
  flags -= NTLMSSP_NEGOTIATE_KEY_EXCH
  flags -= NTLMSSP_NEGOTIATE_128
  flags -= NTLMSSP_NEGOTIATE_SIGN
  flags -= NTLMSSP_NEGOTIATE_SEAL
  flags -= NTLMSSP_NEGOTIATE_TARGET_INFO
  flags -= NTLMSSP_NEGOTIATE_VERSION

  packed = struct.pack('<I', flags)
  ntlm_t1_message = negotiate_message[:12] + packed + negotiate_message[16:32] + W10_VERSION
  if len(negotiate_message) > 40:
    ntlm_t1_message += negotiate_message[40:]

  print "Request (Type 1)"
  print base64.b64encode(ntlm_t1_message)
  print hexdump.hexdump(ntlm_t1_message)


def generate_type2(username, password, auth_domain, target_domain, workstation, nonce, ntlm_version, ucs = False):
  if ntlm_version == 1:
    ntlm_context = NtlmContext(username, password, auth_domain.upper(), workstation.upper(), ntlm_compatibility=0)
  else:
    ntlm_context = NtlmContext(username, password, auth_domain.upper(), workstation.upper(), None, ntlm_compatibility=3)

  if ucs:
    target_domain = target_domain.encode('utf-16-le')

  ntlm_context.step()
  challenge_raw = "NTLMSSP\0"
  challenge_raw += struct.pack("<I", 2) # Type 2 message
  challenge_raw += struct.pack("<H", len(target_domain))
  challenge_raw += struct.pack("<H", len(target_domain))
  challenge_raw += struct.pack("<I", 56) # target position
  flags = NTLMSSP_NEGOTIATE_OEM | NTLMSSP_NEGOTIATE_NTLM | NTLMSSP_REQUEST_TARGET | NTLMSSP_NEGOTIATE_TARGET_INFO | NTLMSSP_TARGET_TYPE_DOMAIN
  if ntlm_version == 2:
    flags |= NTLMSSP_NEGOTIATE_NTLM2_KEY
  if ucs:
    flags |= NTLMSSP_NEGOTIATE_UCS2
    flags &= ~NTLMSSP_NEGOTIATE_OEM

  challenge_raw += struct.pack("<I", flags)
  challenge_raw += nonce #struct.pack("<Q", nonce) # challenge
  challenge_raw += struct.pack("<Q", 0) # context, not used

  target_info = struct.pack("<H", 2) # Info type domain
  target_info += struct.pack("<H", len(target_domain)) # Block length
  target_info += target_domain.upper()
  target_info += struct.pack("<I", 0) # Terminate subblock

  challenge_raw += struct.pack("<H", len(target_info))
  challenge_raw += struct.pack("<H", len(target_info))
  challenge_raw += struct.pack("<I", 56 + len(target_domain)) # target info position
  challenge_raw += W10_VERSION # OS Version structure
  challenge_raw += target_domain.upper()
  challenge_raw += target_info

  #challenge_b64 = "TlRMTVNTUAACAAAAAAAAACgAAAABggAAU3J2Tm9uY2UAAAAAAAAAAA=="
  #challenge_message = base64.b64decode(challenge_b64)

  print "Challenge (Type 2)"
  print base64.b64encode(challenge_raw)
  print hexdump.hexdump(challenge_raw)

  response_message = ntlm_context.step(challenge_raw)

  unpacked = struct.unpack('<I', response_message[60:64])
  flags = unpacked[0]
  if ucs:
    # Fix bug in the python lib
    flags &= ~NTLMSSP_NEGOTIATE_OEM
    flags |= NTLMSSP_REQUEST_TARGET

  packed = struct.pack('<I', flags)
  ntlm_t3_message = response_message[:60] + packed + W10_VERSION + response_message[72:]
  print "Response (Type 3)"
  print base64.b64encode(ntlm_t3_message)
  print hexdump.hexdump(ntlm_t3_message)

username = 'Zaphod'
password = 'Beeblebrox'
domain = 'Ursa-Minor'
workstation = 'LightCity'
nonce = 'SrvNonce'

generate_type1(username, password, None, None, 0) # 0 is both 1 and 2
generate_type1(username, password, None, None, 2)

generate_type1(username, password, domain, workstation, 1)
generate_type1(username, password, domain, workstation, 2)

generate_type2(username, password, domain, domain, workstation, nonce, 1)
generate_type2(username, password, domain, domain, workstation, nonce, 1, True)

generate_type2(username, password, domain, domain, workstation, nonce, 2)
generate_type2(username, password, domain, domain, workstation, nonce, 2, True)
