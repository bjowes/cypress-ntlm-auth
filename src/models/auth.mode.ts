export const AuthMode = {
  NotApplicable: 0,
  NotSupported: 1,
  BasicAuthentication: 2,
  NTLM: 3,
  Negotiate: 4,
}

export type AuthModeType = (typeof AuthMode)[keyof typeof AuthMode];