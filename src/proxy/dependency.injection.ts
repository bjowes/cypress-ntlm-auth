import { Container } from "inversify";
import type { interfaces } from "inversify";
import "reflect-metadata";

import { TYPES } from "./dependency.injection.types.ts";

import type { IConfigController } from "./interfaces/i.config.controller.ts";
import { ConfigController } from "./config.controller.ts";

import type { IConnectionContext } from "./interfaces/i.connection.context.ts";
import { ConnectionContext } from "./connection.context.ts";

import type { IConnectionContextManager } from "./interfaces/i.connection.context.manager.ts";
import { ConnectionContextManager } from "./connection.context.manager.ts";

import type { IConfigStore } from "./interfaces/i.config.store.ts";
import { ConfigStore } from "./config.store.ts";

import type { IConfigServer } from "./interfaces/i.config.server.ts";
import { ConfigServer } from "./config.server.ts";

import type { ICoreServer } from "./interfaces/i.core.server.ts";
import { CoreServer } from "./core.server.ts";

import type { IStartup } from "../startup/interfaces/i.startup.ts";
import { Startup } from "../startup/startup.ts";

import type { IUpstreamProxyManager } from "./interfaces/i.upstream.proxy.manager.ts";
import { UpstreamProxyManager } from "./upstream.proxy.manager.ts";

import type { IUpstreamProxyConfigurator } from "../startup/interfaces/i.upstream.proxy.configurator.ts";
import { UpstreamProxyConfigurator } from "../startup/upstream.proxy.configurator.ts";

import type { IWinSsoFacadeFactory } from "./interfaces/i.win-sso.facade.factory.ts";
import { WinSsoFacadeFactory } from "./win-sso.facade.factory.ts";

import type { INegotiateManager } from "./interfaces/i.negotiate.manager.ts";
import { NegotiateManager } from "./negotiate.manager.ts";

import type { INtlm } from "../ntlm/interfaces/i.ntlm.ts";
import { Ntlm } from "../ntlm/ntlm.ts";

import type { INtlmManager } from "./interfaces/i.ntlm.manager.ts";
import { NtlmManager } from "./ntlm.manager.ts";

import type { INtlmProxyMitm } from "./interfaces/i.ntlm.proxy.mitm.ts";
import { NtlmProxyMitm } from "./ntlm.proxy.mitm.ts";

import type { INtlmProxyServer } from "./interfaces/i.ntlm.proxy.server.ts";
import { NtlmProxyServer } from "./ntlm.proxy.server.ts";

import type { IExpressServerFacade } from "./interfaces/i.express.server.facade.ts";
import { ExpressServerFacade } from "./express.server.facade.ts";

import type { IHttpMitmProxyFacade } from "./interfaces/i.http.mitm.proxy.facade.ts";
import { HttpMitmProxyFacade } from "./http.mitm.proxy.facade.ts";

import type { IConsoleLogger } from "../util/interfaces/i.console.logger.ts";
import { ConsoleLogger } from "../util/console.logger.ts";

import type { IDebugLogger } from "../util/interfaces/i.debug.logger.ts";
import { DebugLogger } from "../util/debug.logger.ts";

import type { INtlmProxyFacade } from "../startup/interfaces/i.ntlm.proxy.facade.ts";
import { NtlmProxyFacade } from "../startup/ntlm.proxy.facade.ts";

import type { IMain } from "./interfaces/i.main.ts";
import { Main } from "./main.ts";

import type { ICypressFacade } from "../startup/interfaces/i.cypress.facade.ts";
import { CypressFacade } from "../startup/cypress.facade.ts";
import type { IPortsConfigStore } from "./interfaces/i.ports.config.store.ts";
import { PortsConfigStore } from "./ports.config.store.ts";
import type { IEnvironment } from "../startup/interfaces/i.environment.ts";
import { Environment } from "../startup/environment.ts";
import type { IHttpsValidation } from "./interfaces/i.https.validation.ts";
import { HttpsValidation } from "./https.validation.ts";
import type { ITlsCertValidator } from "../util/interfaces/i.tls.cert.validator.ts";
import { TlsCertValidator } from "../util/tls.cert.validator.ts";

/**
 * Dependency injection
 */
export class DependencyInjection {
  private _container: Container;

  /**
   * Constructor
   */
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
  }

  /**
   * Get a type from the DI container
   * @param typename Type symbol
   * @returns Instance of requested type
   */
  get<T>(typename: symbol): T {
    return this._container.get(typename);
  }
}
