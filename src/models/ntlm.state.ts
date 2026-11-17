export const NtlmState = {
  NotAuthenticated: 0,
  Type1Sent: 1,
  Type2Received: 2,
  Type3Sent: 3,
  Authenticated: 4,
}

export type NtlmStateType = (typeof NtlmState)[keyof typeof NtlmState];
