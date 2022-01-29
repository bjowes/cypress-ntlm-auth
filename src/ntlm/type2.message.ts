import { NtlmFlags } from "./ntlm.flags.js";
import { NtlmConstants } from "./ntlm.constants.js";

interface TargetInfoHash {
  [key: string]: string | null;
}

export class Type2Message {
  raw: Buffer;
  flags: number;
  encoding: "ascii" | "ucs2";
  version: number;
  challenge: Buffer;
  targetName: string;
  targetInfo: any;

  constructor(buf: Buffer) {
    this.raw = buf;

    // check signature
    if (buf.toString("ascii", 0, NtlmConstants.NTLM_SIGNATURE.length) !== NtlmConstants.NTLM_SIGNATURE) {
      throw new Error("Invalid message signature");
    }

    // check message type
    if (buf.readUInt32LE(NtlmConstants.NTLM_SIGNATURE.length) !== 2) {
      throw new Error("Invalid message type (no type 2)");
    }

    // read flags
    this.flags = buf.readUInt32LE(20);

    this.encoding = this.flags & NtlmFlags.NEGOTIATE_OEM ? "ascii" : "ucs2";

    this.version = this.flags & NtlmFlags.NEGOTIATE_NTLM2_KEY ? 2 : 1;

    this.challenge = buf.slice(24, 32);

    // read target name
    this.targetName = this.readTargetName();

    // read target info
    if (this.flags & NtlmFlags.NEGOTIATE_TARGET_INFO) {
      this.targetInfo = this.parseTargetInfo();
    }
  }

  private readTargetName(): string {
    const length = this.raw.readUInt16LE(12);
    // skipping allocated space
    const offset = this.raw.readUInt32LE(16);

    if (length === 0) {
      return "";
    }

    if (offset + length > this.raw.length || offset < 32) {
      throw new Error("Bad type 2 message");
    }

    return this.raw.toString(this.encoding, offset, offset + length);
  }

  private parseTargetInfo() {
    const info: TargetInfoHash = {};

    const length = this.raw.readUInt16LE(40);
    // skipping allocated space
    const offset = this.raw.readUInt32LE(44);

    const targetInfoBuffer = Buffer.alloc(length);
    this.raw.copy(targetInfoBuffer, 0, offset, offset + length);

    if (length === 0) {
      return info;
    }

    if (offset + length > this.raw.length || offset < 32) {
      throw new Error("Bad type 2 message");
    }

    let pos = offset;

    while (pos < offset + length) {
      const blockType = this.raw.readUInt16LE(pos);
      pos += 2;
      const blockLength = this.raw.readUInt16LE(pos);
      pos += 2;

      if (blockType === 0) {
        // reached the terminator subblock
        break;
      }

      let blockTypeStr;
      let blockTypeOutput = "string";

      switch (blockType) {
        case 0x01:
          blockTypeStr = "SERVER";
          break;
        case 0x02:
          blockTypeStr = "DOMAIN";
          break;
        case 0x03:
          blockTypeStr = "FQDN";
          break;
        case 0x04:
          blockTypeStr = "DNS";
          break;
        case 0x05:
          blockTypeStr = "PARENT_DNS";
          break;
        case 0x06:
          blockTypeStr = "FLAGS";
          blockTypeOutput = "hex";
          break;
        case 0x07:
          blockTypeStr = "SERVER_TIMESTAMP";
          blockTypeOutput = "hex";
          break;
        case 0x08:
          blockTypeStr = "SINGLE_HOST";
          blockTypeOutput = "hex";
          break;
        case 0x09:
          blockTypeStr = "TARGET_NAME";
          break;
        case 0x0a:
          blockTypeStr = "CHANNEL_BINDING";
          blockTypeOutput = "hex";
          break;
        default:
          blockTypeStr = "";
          break;
      }

      if (blockTypeStr) {
        if (blockTypeOutput === "string") {
          info[blockTypeStr] = this.raw.toString("ucs2", pos, pos + blockLength);
        } else {
          // Output as hex in little endian order
          const twoCharBlocks = this.raw.toString("hex", pos, pos + blockLength).match(/.{2}/g);
          if (twoCharBlocks) {
            info[blockTypeStr] = twoCharBlocks.reverse().join("");
          } else {
            info[blockTypeStr] = null;
          }
        }
      }

      pos += blockLength;
    }

    return {
      parsed: info,
      buffer: targetInfoBuffer,
    };
  }
}
