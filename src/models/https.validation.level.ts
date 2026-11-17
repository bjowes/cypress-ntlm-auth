export const HttpsValidationLevel = {
  Unsafe: 0,
  Warn: 1,
  Strict: 2,
}

export type HttpsValidationLevelType = (typeof HttpsValidationLevel)[keyof typeof HttpsValidationLevel];