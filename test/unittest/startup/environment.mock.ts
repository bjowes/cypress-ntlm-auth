import { PortsConfig } from "../../../src/models/ports.config.model";
import { IEnvironment } from "../../../src/startup/interfaces/i.environment";

export class EnvironmentMock implements IEnvironment {
  private readonly _loopbackDisable = "<-loopback>";
  public configApiUrl: string | undefined;
  public ntlmProxyUrl: string | undefined;
  public httpProxy: string | undefined;
  public httpsProxy: string | undefined;
  public noProxy: string | undefined;

  get configApiPort(): number | undefined {
    return this.portFromUrl(this.configApiUrl);
  }
  get ntlmProxyPort(): number | undefined {
    return this.portFromUrl(this.ntlmProxyUrl);
  }

  configureForCypress(ports: PortsConfig) {
    this.configApiUrl = ports.configApiUrl;
    this.ntlmProxyUrl = ports.ntlmProxyUrl;
    this.httpProxy = ports.ntlmProxyUrl;
    this.httpsProxy = ports.ntlmProxyUrl;
    this.noProxy = this._loopbackDisable;
  }

  public deletedKeys: string[] = [];
  delete(key: string) {
    this.deletedKeys.push(key);
  }

  private portFromUrl(value: string | undefined): number | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = new URL(value);
    if (!parsed.port) {
      return undefined;
    }
    return +parsed.port;
  }
}
