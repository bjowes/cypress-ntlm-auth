/**
 * NTLM Message
 */
export class NtlmMessage {
  raw: Buffer;

  /**
   * Constructor
   * @param buf Buffer
   */
  constructor(buf: Buffer) {
    this.raw = buf;
  }

  /** 
   * Get header
   * @returns NTLM message encoded in header format
   */
  header(): string {
    return 'NTLM ' + this.raw.toString('base64');
  }
}
