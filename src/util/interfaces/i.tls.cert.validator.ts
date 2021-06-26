import { CompleteUrl } from "../../models/complete.url.model";

export interface ITlsCertValidator {
  validate(targetHost: CompleteUrl): Promise<void>;
}
