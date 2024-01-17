import { Container, interfaces } from "inversify";
import "reflect-metadata";

import { TYPES } from "./dependency.injection.types";

import { IConfigController } from "./interfaces/i.config.controller";
import { ConfigController } from "./config.controller";

import { IConnectionContext } from "./interfaces/i.connection.context";
import { ConnectionContext } from "./connection.context";

import { IConnectionContextManager } from "./interfaces/i.connection.context.manager";
import { ConnectionContextManager } from "./connection.context.manager";

import { IConfigStore } from "./interfaces/i.config.store";
import { ConfigStore } from "./config.store";

import { IConfigServer } from "./interfaces/i.config.server";
import { ConfigServer } from "./config.server";

import { ICoreServer } from "./interfaces/i.core.server";
import { CoreServer } from "./core.server";

import { IStartup } from "../startup/interfaces/i.startup";
import { Startup } from "../startup/startup";

import { IUpstreamProxyManager } from "./interfaces/i.upstream.proxy.manager";
import { UpstreamProxyManager } from "./upstream.proxy.manager";

import { IUpstreamProxyConfigurator } from "../startup/interfaces/i.upstream.proxy.configurator";
import { UpstreamProxyConfigurator } from "../startup/upstream.proxy.configurator";

import { IWinSsoFacadeFactory } from "./interfaces/i.win-sso.facade.factory";
import { WinSsoFacadeFactory } from "./win-sso.facade.factory";

import { INegotiateManager } from "./interfaces/i.negotiate.manager";
import { NegotiateManager } from "./negotiate.manager";

import { INtlm } from "../ntlm/interfaces/i.ntlm";
import { Ntlm } from "../ntlm/ntlm";

import { INtlmManager } from "./interfaces/i.ntlm.manager";
import { NtlmManager } from "./ntlm.manager";

import { INtlmProxyMitm } from "./interfaces/i.ntlm.proxy.mitm";
import { NtlmProxyMitm } from "./ntlm.proxy.mitm";

import { INtlmProxyServer } from "./interfaces/i.ntlm.proxy.server";
import { NtlmProxyServer } from "./ntlm.proxy.server";

import { IExpressServerFacade } from "./interfaces/i.express.server.facade";
import { ExpressServerFacade } from "./express.server.facade";

import { IHttpMitmProxyFacade } from "./interfaces/i.http.mitm.proxy.facade";
import { HttpMitmProxyFacade } from "./http.mitm.proxy.facade";

import { IConsoleLogger } from "../util/interfaces/i.console.logger";
import { ConsoleLogger } from "../util/console.logger";

import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { DebugLogger } from "../util/debug.logger";

import { INtlmProxyFacade } from "../startup/interfaces/i.ntlm.proxy.facade";
import { NtlmProxyFacade } from "../startup/ntlm.proxy.facade";

import { IMain } from "./interfaces/i.main";
import { Main } from "./main";

import { ICypressFacade } from "../startup/interfaces/i.cypress.facade";
import { CypressFacade } from "../startup/cypress.facade";
import { IPortsConfigStore } from "./interfaces/i.ports.config.store";
import { PortsConfigStore } from "./ports.config.store";
import { IEnvironment } from "../startup/interfaces/i.environment";
import { Environment } from "../startup/environment";
import { IHttpsValidation } from "./interfaces/i.https.validation";
import { HttpsValidation } from "./https.validation";
import { ITlsCertValidator } from "../util/interfaces/i.tls.cert.validator";
import { TlsCertValidator } from "../util/tls.cert.validator";
import { IWindowsProxySettingsFacade } from "../startup/interfaces/i.windows.proxy.settings.facade";
import { WindowsProxySettingsFacade } from "../startup/windows.proxy.settings.facade";

export class DependencyInjection {
  private _container: Container;

  constructor() {
    this._container = new Container({ defaultScope: "Request" });
    this._container
      .bind<IPortsConfigStore>(TYPES.IPortsConfigStore)
      .to(PortsConfigStore);
    this._container
      .bind<IConfigController>(TYPES.IConfigController)
      .to(ConfigController);
    this._container.bind<IConfigServer>(TYPES.IConfigServer).to(ConfigServer);
    this._container.bind<IConfigStore>(TYPES.IConfigStore).to(ConfigStore);
    this._container
      .bind<IConnectionContextManager>(TYPES.IConnectionContextManager)
      .to(ConnectionContextManager);
    this._container.bind<ICoreServer>(TYPES.ICoreServer).to(CoreServer);
    this._container
      .bind<ICypressFacade>(TYPES.ICypressFacade)
      .to(CypressFacade);
    this._container.bind<IStartup>(TYPES.IStartup).to(Startup);
    this._container
      .bind<IDebugLogger>(TYPES.IDebugLogger)
      .to(DebugLogger)
      .inSingletonScope();
    this._container
      .bind<IConsoleLogger>(TYPES.IConsoleLogger)
      .to(ConsoleLogger)
      .inSingletonScope();
    this._container.bind<IEnvironment>(TYPES.IEnvironment).to(Environment);
    this._container
      .bind<IExpressServerFacade>(TYPES.IExpressServerFacade)
      .to(ExpressServerFacade);
    this._container
      .bind<IHttpMitmProxyFacade>(TYPES.IHttpMitmProxyFacade)
      .to(HttpMitmProxyFacade);
    this._container
      .bind<IHttpsValidation>(TYPES.IHttpsValidation)
      .to(HttpsValidation);
    this._container.bind<IMain>(TYPES.IMain).to(Main);
    this._container
      .bind<INegotiateManager>(TYPES.INegotiateManager)
      .to(NegotiateManager);
    this._container.bind<INtlm>(TYPES.INtlm).to(Ntlm);
    this._container.bind<INtlmManager>(TYPES.INtlmManager).to(NtlmManager);
    this._container
      .bind<INtlmProxyFacade>(TYPES.INtlmProxyFacade)
      .to(NtlmProxyFacade);
    this._container
      .bind<INtlmProxyMitm>(TYPES.INtlmProxyMitm)
      .to(NtlmProxyMitm);
    this._container
      .bind<INtlmProxyServer>(TYPES.INtlmProxyServer)
      .to(NtlmProxyServer);
    this._container
      .bind<ITlsCertValidator>(TYPES.ITlsCertValidator)
      .to(TlsCertValidator);
    this._container
      .bind<IUpstreamProxyConfigurator>(TYPES.IUpstreamProxyConfigurator)
      .to(UpstreamProxyConfigurator);
    this._container
      .bind<IUpstreamProxyManager>(TYPES.IUpstreamProxyManager)
      .to(UpstreamProxyManager);

    this._container
      .bind<interfaces.Newable<IConnectionContext>>(
        TYPES.NewableIConnectionContext
      )
      .toConstructor<IConnectionContext>(ConnectionContext);
    this._container
      .bind<IWinSsoFacadeFactory>(TYPES.IWinSsoFacadeFactory)
      .to(WinSsoFacadeFactory);

    this._container
        .bind<IWindowsProxySettingsFacade>(TYPES.IWindowsProxySettingsFacade)
        .to(WindowsProxySettingsFacade);
  }

  get<T>(typename: symbol): T {
    return this._container.get(typename);
  }
}
