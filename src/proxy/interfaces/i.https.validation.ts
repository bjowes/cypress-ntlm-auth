export interface IHttpsValidation {
  useRequestHttpsValidation(): boolean;
  validateRequest(targetUrl: URL): void;
  validateConnect(targetUrl: URL): void;
  reset(): void;
}
