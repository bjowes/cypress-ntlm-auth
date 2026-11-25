export abstract class IHttpsValidation {
  abstract useRequestHttpsValidation(): boolean;
  abstract validateRequest(targetUrl: URL): void;
  abstract validateConnect(targetUrl: URL): void;
  abstract reset(): void;
}
