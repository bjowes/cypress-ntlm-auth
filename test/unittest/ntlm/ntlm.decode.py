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

flags_tbl_str = """0x00000001	Negotiate Unicode
0x00000002	Negotiate OEM
0x00000004	Request Target
0x00000008	unknown
0x00000010	Negotiate Sign
0x00000020	Negotiate Seal
0x00000040	Negotiate Datagram Style
0x00000080	Negotiate Lan Manager Key
0x00000100	Negotiate Netware
0x00000200	Negotiate NTLM
0x00000400	unknown
0x00000800	Negotiate Anonymous
0x00001000	Negotiate Domain Supplied
0x00002000	Negotiate Workstation Supplied
0x00004000	Negotiate Local Call
0x00008000	Negotiate Always Sign
0x00010000	Target Type Domain
0x00020000	Target Type Server
0x00040000	Target Type Share
0x00080000	Negotiate NTLM2 Key
0x00100000	Request Init Response
0x00200000	Request Accept Response
0x00400000	Request Non-NT Session Key
0x00800000	Negotiate Target Info
0x01000000	unknown
0x02000000	Negotiate Version
0x04000000	unknown
0x08000000	unknown
0x10000000	unknown
0x20000000	Negotiate 128
0x40000000	Negotiate Key Exchange
0x80000000	Negotiate 56"""
flags_tbl = [line.split('\t') for line in flags_tbl_str.split('\n')]
flags_tbl = [(int(x,base=16),y) for x,y in flags_tbl]

def flags_lst(flags):
    return [desc for val, desc in flags_tbl if val & flags]
def flags_str(flags):
    return ', '.join('"%s"' % s for s in flags_lst(flags))

NEGOTIATE_UNICODE = 0x00000001
NEGOTIATE_OEM = 0x00000002
def use_encoding(flags):
    if flags & NEGOTIATE_UNICODE:
      return 'utf-16'
    elif flags & NEGOTIATE_OEM:
      return 'ascii'
    else:
      return None

VALID_CHRS = set(string.ascii_letters + string.digits + string.punctuation)
def clean_str(st: string):
    return ''.join((s if s in VALID_CHRS else '?') for s in st)

class StrStruct(object):
    def __init__(self, pos_tup, raw: bytes, encoding):
        length, alloc, offset = pos_tup
        self.length = length
        self.alloc = alloc
        self.offset = offset
        self.raw = raw[offset:offset+length]
        self.utf16 = False

        if encoding == 'utf-16':
            self.string = self.raw.decode('utf-16')
            self.utf16 = True
        elif encoding == 'ascii':
            self.string = self.raw.decode('ascii')
        else:
            self.string = self.raw

    def __str__(self):
        st = "%s'%s' [%s] (%db @%d)" % ('u' if self.utf16 else '',
                                        clean_str(self.string),
                                        self.raw.hex(),
                                        self.length, self.offset)
        if self.alloc != self.length:
            st += " alloc: %d" % self.alloc
        return st

msg_types = collections.defaultdict(lambda: "UNKNOWN")
msg_types[1] = "Request"
msg_types[2] = "Challenge"
msg_types[3] = "Response"

target_field_types = collections.defaultdict(lambda: "UNKNOWN")
target_field_types[0] = "TERMINATOR"
target_field_types[1] = "Server name"
target_field_types[2] = "AD domain name"
target_field_types[3] = "FQDN"
target_field_types[4] = "DNS domain name"
target_field_types[5] = "Parent DNS domain"
target_field_types[6] = "AV Flags"
target_field_types[7] = "Server Timestamp"
target_field_types[8] = "Single Host"
target_field_types[9] = "Target Name"
target_field_types[10] = "Channel Bindings"

def main():
    st_raw = sys.stdin.read()
    try:
        st = base64.b64decode(st_raw)
    except e:
        print("Input is not a valid base64-encoded string")
        return

    if st[:8] == b'NTLMSSP\x00':
        print("Found NTLMSSP header")
    else:
        print("NTLMSSP header not found at start of input string")
        return

    ver_tup = struct.unpack("<I", st[8:12])
    ver = ver_tup[0]

    print("Msg Type: %d (%s)" % (ver, msg_types[ver]))

    if ver == 1:
        pretty_print_request(st)
    elif ver == 2:
        pretty_print_challenge(st)
    elif ver == 3:
        pretty_print_response(st)
    else:
        print("Unknown message structure.  Have a raw (hex-encoded) message:")
        print(st.encode("hex"))


def opt_str_struct(name, st: bytes, offset, decode = True):
    nxt = st[offset:offset+8]
    if len(nxt) == 8:
        hdr_tup = struct.unpack("<hhI", nxt)
        print("%s: %s" % (name, StrStruct(hdr_tup, st, decode)))
    else:
        print("%s: [omitted]" % name)

def opt_inline_str(name, st: bytes, offset, sz):
    nxt = st[offset:offset+sz]
    if len(nxt) == sz:
        print("%s: '%s'" % (name, clean_str(nxt)))
    else:
        print("%s: [omitted]" % name)

def opt_version(st: bytes, offset):
    major = struct.unpack_from("<B", st, offset)
    minor = struct.unpack_from("<B", st, offset+1)
    build = struct.unpack_from("<H", st, offset+2)
    version = struct.unpack_from("<B", st, offset+7)
    print("OS Ver: Major %d, Minor %d, build %d, NTLM version %d" % (major[0], minor[0], build[0], version[0]))

def pretty_print_request(st: bytes):
    hdr_tup = struct.unpack("<I", st[12:16])
    flags = hdr_tup[0]

    opt_str_struct("Domain", st, 16, 'ascii') # always sent as ASCII
    opt_str_struct("Workstation", st, 24, 'ascii') # always sent as ASCII

    opt_version(st, 32)

    print("Flags: 0x%08x [%s]" % (flags, flags_str(flags)))


def pretty_print_challenge(st):
    hdr_tup = struct.unpack("<hhIIQ", st[12:32])
    flags = hdr_tup[3]

    print("Target Name: %s" % StrStruct(hdr_tup[0:3], st, use_encoding(flags))) # follows encoding flag
    print("Challenge: 0x%016x" % hdr_tup[4])


    opt_str_struct("Context", st, 32)

    nxt = st[40:48]
    if len(nxt) == 8:
        hdr_tup = struct.unpack("<hhi", nxt)
        tgt = StrStruct(hdr_tup, st, None)

        output = "Target: [block] (%db @%d)" % (tgt.length, tgt.offset)
        if tgt.alloc != tgt.length:
            output += " alloc: %d" % tgt.alloc
        print(output)

        raw = tgt.raw
        pos = 0

        while pos+4 < len(raw):
            rec_hdr = struct.unpack("<hh", raw[pos : pos+4])
            rec_type_id = rec_hdr[0]
            rec_type = target_field_types[rec_type_id]
            rec_sz = rec_hdr[1]
            if rec_type_id == 7:
              value = struct.unpack(">Q", raw[pos+4 : pos+4+rec_sz])
              print("    %s (%d): 0x%016x" % (rec_type, rec_type_id, value[0]))
            elif rec_type_id == 6:
              value = struct.unpack(">I", raw[pos+4 : pos+4+rec_sz])
              print("    %s (%d): 0x%08x" % (rec_type, rec_type_id, value[0]))
            else:
              subst = raw[pos+4 : pos+4+rec_sz]
              print("    %s (%d): %s" % (rec_type, rec_type_id, subst.decode('utf-16'))) # always Unicode
            pos += 4 + rec_sz

    if (len(st) > 48):
      opt_version(st, 48)

    print("Flags: 0x%08x [%s]" % (flags, flags_str(flags)))

def pretty_print_ntlm_resp(st):
    nt_proof = struct.unpack(">QQ", st[0:16])
    print("  NT Proof: 0x%x%x" % (nt_proof[0], nt_proof[1]))
    # validate
    reserved_val = struct.unpack("<BBHI", st[16:24])
    assert reserved_val[0] == 0x01
    assert reserved_val[1] == 0x01
    assert reserved_val[2] == 0x0000
    assert reserved_val[3] == 0x00000000
    timestamp = struct.unpack(">Q", st[24:32])
    print("  Timestamp: 0x%016x" % (timestamp[0]))
    client_challenge = struct.unpack(">Q", st[32:40])
    print("  Client challenge: 0x%016x" % (client_challenge[0]))

    reserved_val = struct.unpack("<I", st[40:44])
    assert reserved_val[0] == 0x00000000

    print("  Target Info:")
    pos = 44
    while pos+4 < len(st):
            rec_hdr = struct.unpack("<hh", st[pos : pos+4])
            rec_type_id = rec_hdr[0]
            rec_type = target_field_types[rec_type_id]
            rec_sz = rec_hdr[1]
            if rec_type_id == 7:
              value = struct.unpack(">Q", st[pos+4 : pos+4+rec_sz])
              print("    %s (%d): 0x%016x" % (rec_type, rec_type_id, value[0]))
            elif rec_type_id == 10:
              value = struct.unpack(">QQ", st[pos+4 : pos+4+rec_sz])
              print("    %s (%d): 0x%016x%016x" % (rec_type, rec_type_id, value[0], value[1]))
            elif rec_type_id == 8:
              shd_len = rec_sz
              if rec_sz > 48: # We should ignore anything above 48 bytes
                shd_len = 48
              value = struct.unpack(">IIQQQQQ", st[pos+4 : pos+4+shd_len])
              print("    %s (%d): Size: %d CustomData: 0x%08x MachineID: 0x%016x%016x%016x%016x" % (rec_type, rec_type_id, value[0], value[2], value[3], value[4], value[5], value[6]))
            elif rec_type_id == 6:
              value = struct.unpack(">I", st[pos+4 : pos+4+rec_sz])
              print("    %s (%d): 0x%08x" % (rec_type, rec_type_id, value[0]))
            else:
              subst = st[pos+4 : pos+4+rec_sz]
              print("    %s (%d): %s" % (rec_type, rec_type_id, subst.decode('utf-16'))) # always Unicode
            pos += 4 + rec_sz

    reserved_val = struct.unpack("<I", st[pos:pos+4])
    assert reserved_val[0] == 0x00000000

def pretty_print_response(st):
    hdr_tup = struct.unpack("<hhihhihhihhihhi", st[12:52])

    nxt = st[60:64]
    has_flags = len(nxt) == 4
    if has_flags:
        flg_tup = struct.unpack("<I", nxt)
        flags = flg_tup[0]
    else:
        flags = 0

    print("LM Resp: %s" % StrStruct(hdr_tup[0:3], st, None))
    print("NTLM Resp:")
    pretty_print_ntlm_resp(st[hdr_tup[5]:hdr_tup[5]+hdr_tup[3]]) # StrStruct(hdr_tup[3:6], st)
    print("Target Name: %s" % StrStruct(hdr_tup[6:9], st, use_encoding(flags))) # follow flags
    print("User Name: %s" % StrStruct(hdr_tup[9:12], st, use_encoding(flags))) # follow flags
    print("Host Name: %s" % StrStruct(hdr_tup[12:15], st, use_encoding(flags))) # follow flags

    opt_str_struct("Session Key", st, 52)
    opt_version(st, 64)


    if has_flags:
        print("Flags: 0x%08x [%s]" % (flags, flags_str(flags)))
    else:
        print("Flags: [omitted]")

    payload_offset = min(hdr_tup[2], hdr_tup[5], hdr_tup[8], hdr_tup[11], hdr_tup[14])
    if payload_offset == (72+16):
        value = struct.unpack(">QQ", st[72:88])
        print("MIC: 0x%016x%016x" % (value[0], value[1]))

if __name__ == "__main__":
    main()
