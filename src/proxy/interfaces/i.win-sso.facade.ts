export abstract class IWinSsoFacade {
  abstract createAuthRequestHeader(): string;
  abstract createAuthResponseHeader(challengeHeader: string | undefined): string;
  abstract freeAuthContext(): void;
}
