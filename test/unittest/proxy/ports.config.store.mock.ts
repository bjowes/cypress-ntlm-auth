import type IPortsConfigStore from "../../../src/proxy/interfaces/i.ports.config.store.ts";

export default class PortsConfigStoreMock implements IPortsConfigStore {
  public configApiUrl?: URL = undefined;
  public ntlmProxyUrl?: URL = undefined;
}
