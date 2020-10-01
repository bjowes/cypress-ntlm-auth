import { IApiUrlStore } from "../../src/proxy/interfaces/i.api.url.store";

export class ApiUrlStoreMock implements IApiUrlStore {
  public configApiUrl = "";
  public ntlmProxyUrl = "";
  public ntlmProxyPort = "";
}
