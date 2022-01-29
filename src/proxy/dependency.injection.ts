import { Container, interfaces } from "inversify";
import "reflect-metadata";

import { TYPES } from "./dependency.injection.types.js";

import { IConfigController } from "./interfaces/i.config.controller.js";
import { ConfigController } from "./config.controller.js";

import { IConnectionContext } from "./interfaces/i.connection.context.js";
import { ConnectionContext } from "./connection.context.js";

import { IConnectionContextManager } from "./interfaces/i.connection.context.manager.js";
import { ConnectionContextManager } from "./connection.context.manager.js";

import { IConfigStore } from "./interfaces/i.config.store.js";
import { ConfigStore } from "./config.store.js";

import { IConfigServer } from "./interfaces/i.config.server.js";
import { ConfigServer } from "./config.server.js";

import { ICoreServer } from "./interfaces/i.core.server.js";
import { CoreServer } from "./core.server.js";

import { IStartup } from "../startup/interfaces/i.startup.js";
import { Startup } from "../startup/startup.js";

import { IUpstreamProxyManager } from "./interfaces/i.upstream.proxy.manager.js";
import { UpstreamProxyManager } from "./upstream.proxy.manager.js";

import { IUpstreamProxyConfigurator } from "../startup/interfaces/i.upstream.proxy.configurator.js";
import { UpstreamProxyConfigurator } from "../startup/upstream.proxy.configurator.js";

import { IWinSsoFacade } from "./interfaces/i.win-sso.facade.js";
import { WinSsoFacade } from "./win-sso.facade.js";

import { INegotiateManager } from "./interfaces/i.negotiate.manager.js";
import { NegotiateManager } from "./negotiate.manager.js";

import { INtlm } from "../ntlm/interfaces/i.ntlm.js";
import { Ntlm } from "../ntlm/ntlm.js";

import { INtlmManager } from "./interfaces/i.ntlm.manager.js";
import { NtlmManager } from "./ntlm.manager.js";

import { INtlmProxyMitm } from "./interfaces/i.ntlm.proxy.mitm.js";
import { NtlmProxyMitm } from "./ntlm.proxy.mitm.js";

import { INtlmProxyServer } from "./interfaces/i.ntlm.proxy.server.js";
import { NtlmProxyServer } from "./ntlm.proxy.server.js";

import { IExpressServerFacade } from "./interfaces/i.express.server.facade.js";
import { ExpressServerFacade } from "./express.server.facade.js";

import { IHttpMitmProxyFacade } from "./interfaces/i.http.mitm.proxy.facade.js";
import { HttpMitmProxyFacade } from "./http.mitm.proxy.facade.js";

import { IDebugLogger } from "../util/interfaces/i.debug.logger.js";
import { DebugLogger } from "../util/debug.logger.js";

import { INtlmProxyFacade } from "../startup/interfaces/i.ntlm.proxy.facade.js";
import { NtlmProxyFacade } from "../startup/ntlm.proxy.facade.js";

import { IMain } from "./interfaces/i.main.js";
import { Main } from "./main.js";

import { ICypressFacade } from "../startup/interfaces/i.cypress.facade.js";
import { CypressFacade } from "../startup/cypress.facade.js";
import { IPortsConfigStore } from "./interfaces/i.ports.config.store.js";
import { PortsConfigStore } from "./ports.config.store.js";
import { IEnvironment } from "../startup/interfaces/i.environment.js";
import { Environment } from "../startup/environment.js";

export class DependencyInjection {
  private _container: Container;

  constructor() {
    this._container = new Container({ defaultScope: "Request" });
    this._container.bind<IPortsConfigStore>(TYPES.IPortsConfigStore).to(PortsConfigStore);
    this._container.bind<IConfigController>(TYPES.IConfigController).to(ConfigController);
    this._container.bind<IConfigServer>(TYPES.IConfigServer).to(ConfigServer);
    this._container.bind<IConfigStore>(TYPES.IConfigStore).to(ConfigStore);
    this._container.bind<IConnectionContextManager>(TYPES.IConnectionContextManager).to(ConnectionContextManager);
    this._container.bind<ICoreServer>(TYPES.ICoreServer).to(CoreServer);
    this._container.bind<ICypressFacade>(TYPES.ICypressFacade).to(CypressFacade);
    this._container.bind<IStartup>(TYPES.IStartup).to(Startup);
    this._container.bind<IDebugLogger>(TYPES.IDebugLogger).to(DebugLogger).inSingletonScope();
    this._container.bind<IEnvironment>(TYPES.IEnvironment).to(Environment);
    this._container.bind<IExpressServerFacade>(TYPES.IExpressServerFacade).to(ExpressServerFacade);
    this._container.bind<IHttpMitmProxyFacade>(TYPES.IHttpMitmProxyFacade).to(HttpMitmProxyFacade);
    this._container.bind<IMain>(TYPES.IMain).to(Main);
    this._container.bind<INegotiateManager>(TYPES.INegotiateManager).to(NegotiateManager);
    this._container.bind<INtlm>(TYPES.INtlm).to(Ntlm);
    this._container.bind<INtlmManager>(TYPES.INtlmManager).to(NtlmManager);
    this._container.bind<INtlmProxyFacade>(TYPES.INtlmProxyFacade).to(NtlmProxyFacade);
    this._container.bind<INtlmProxyMitm>(TYPES.INtlmProxyMitm).to(NtlmProxyMitm);
    this._container.bind<INtlmProxyServer>(TYPES.INtlmProxyServer).to(NtlmProxyServer);
    this._container.bind<IUpstreamProxyConfigurator>(TYPES.IUpstreamProxyConfigurator).to(UpstreamProxyConfigurator);
    this._container.bind<IUpstreamProxyManager>(TYPES.IUpstreamProxyManager).to(UpstreamProxyManager);

    this._container
      .bind<interfaces.Newable<IConnectionContext>>(TYPES.NewableIConnectionContext)
      .toConstructor<IConnectionContext>(ConnectionContext);
    this._container
      .bind<interfaces.Newable<IWinSsoFacade>>(TYPES.NewableIWinSsoFacade)
      .toConstructor<IWinSsoFacade>(WinSsoFacade);
  }

  get<T>(typename: symbol): T {
    return this._container.get(typename);
  }
}
