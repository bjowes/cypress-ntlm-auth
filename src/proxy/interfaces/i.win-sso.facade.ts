export interface IWinSsoFacade {
  createAuthRequestHeader(): string;
  createAuthResponseHeader(challengeHeader: string | undefined): string;
  freeAuthContext(): void;
}
