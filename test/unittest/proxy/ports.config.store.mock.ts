import { IPortsConfigStore } from "../../../src/proxy/interfaces/i.ports.config.store";

export class PortsConfigStoreMock implements IPortsConfigStore {
  public configApiUrl?: URL = undefined;
  public ntlmProxyUrl?: URL = undefined;
}
