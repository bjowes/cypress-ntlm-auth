
import { Container } from 'inversify';

/*
export let TYPES = {
  CoreServer: Symbol.for("CoreServer"),
  ConfigServer: Symbol.for("ConfigServer"),
  ConfigStore: Symbol.for("ConfigStore"),
  AuthenticationStore: Symbol.for("AuthenticationStore"),
  NtlmProxyMitm: Symbol.for("NtlmProxyMitm"),
  NtlmProxyServer: Symbol.for("NtlmProxyServer"),
  PortsFileService: Symbol.for("PortsFileService"),
};
*/

export class DependencyInjection {
  private _container: Container;

  constructor() {
    this._container = new Container({ autoBindInjectable: true, defaultScope: "Singleton" });
  }
}
