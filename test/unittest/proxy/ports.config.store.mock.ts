import { IPortsConfigStore } from "../../../src/proxy/interfaces/i.ports.config.store";
import { URLExt } from "../../../src/util/url.ext";

export class PortsConfigStoreMock implements IPortsConfigStore {
  public configApiUrl?: URLExt = undefined;
  public ntlmProxyUrl?: URLExt = undefined;
}
