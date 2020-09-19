export interface NtlmHost {
  ntlmHost: string;
  username: string;
  password: string;
  domain?: string;
  workstation?: string;
  ntlmVersion: number;
}
