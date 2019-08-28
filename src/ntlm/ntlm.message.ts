export class NtlmMessage {
  raw: Buffer;

  constructor(buf: Buffer) {
    this.raw = buf;
  }

  header(): string {
    return 'NTLM ' + this.raw.toString('base64');
  }
}
