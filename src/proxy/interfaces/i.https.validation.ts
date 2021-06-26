import { CompleteUrl } from "../../models/complete.url.model";

export interface IHttpsValidation {
  useHttpsValidation(targetUrl: CompleteUrl): boolean
  validateRequest(targetUrl: CompleteUrl): void;
  validateConnect(targetUrl: CompleteUrl): void;
  reset(): void;
}
