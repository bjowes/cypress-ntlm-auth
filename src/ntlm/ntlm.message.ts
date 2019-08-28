export class NtlmMessage {
  raw: Buffer = Buffer.alloc(0);

  constructor(buf: Buffer) {
    this.raw = buf;
  }

  header(): string {
    return 'NTLM ' + this.raw.toString('base64');
  }
}
