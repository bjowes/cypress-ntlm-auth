export interface ITlsCertValidator {
  validate(targetHost: URL): Promise<void>;
}
