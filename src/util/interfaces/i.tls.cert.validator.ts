export abstract class ITlsCertValidator {
  abstract validate(targetHost: URL): Promise<void>;
}
