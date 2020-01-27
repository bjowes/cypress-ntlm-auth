import { Container, interfaces } from "inversify";
import { TYPES } from "./dependency.injection.types";
import "reflect-metadata";

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

import { ICypressNtlm } from "../util/interfaces/i.cypress.ntlm";
import { CypressNtlm } from "../util/cypress.ntlm";

import { IUpstreamProxyManager } from "./interfaces/i.upstream.proxy.manager";
import { UpstreamProxyManager } from "./upstream.proxy.manager";

import { IUpstreamProxyConfigurator } from "../util/interfaces/i.upstream.proxy.configurator";
import { UpstreamProxyConfigurator } from "../util/upstream.proxy.configurator";

import { IWinSsoFacade } from "./interfaces/i.win-sso.facade";
import { WinSsoFacade } from "./win-sso.facade";

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

import { IPortsFileService } from "../util/interfaces/i.ports.file.service";
import { PortsFileService } from "../util/ports.file.service";

import { IHttpMitmProxyFacade } from "./interfaces/i.http.mitm.proxy.facade";
import { HttpMitmProxyFacade } from "./http.mitm.proxy.facade";

import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { DebugLogger } from "../util/debug.logger";

import { INtlmProxyExit } from "../util/interfaces/i.ntlm.proxy.exit";
import { NtlmProxyExit } from "../util/ntlm.proxy.exit";

import { IMain } from "./interfaces/i.main";
import { Main } from "./main";

export class DependencyInjection {
  private _container: Container;

  constructor() {
    this._container = new Container({ defaultScope: "Singleton" });
    this._container
      .bind<IConfigController>(TYPES.IConfigController)
      .to(ConfigController);
    this._container.bind<IConfigServer>(TYPES.IConfigServer).to(ConfigServer);
    this._container.bind<IConfigStore>(TYPES.IConfigStore).to(ConfigStore);
    this._container
      .bind<IConnectionContextManager>(TYPES.IConnectionContextManager)
      .to(ConnectionContextManager);
    this._container.bind<ICoreServer>(TYPES.ICoreServer).to(CoreServer);
    this._container.bind<ICypressNtlm>(TYPES.ICypressNtlm).to(CypressNtlm);
    this._container.bind<IDebugLogger>(TYPES.IDebugLogger).to(DebugLogger);
    this._container
      .bind<IExpressServerFacade>(TYPES.IExpressServerFacade)
      .to(ExpressServerFacade);
    this._container
      .bind<IHttpMitmProxyFacade>(TYPES.IHttpMitmProxyFacade)
      .to(HttpMitmProxyFacade);
    this._container.bind<IMain>(TYPES.IMain).to(Main);
    this._container
      .bind<INegotiateManager>(TYPES.INegotiateManager)
      .to(NegotiateManager);
    this._container.bind<INtlm>(TYPES.INtlm).to(Ntlm);
    this._container.bind<INtlmManager>(TYPES.INtlmManager).to(NtlmManager);
    this._container
      .bind<INtlmProxyExit>(TYPES.INtlmProxyExit)
      .to(NtlmProxyExit);
    this._container
      .bind<INtlmProxyMitm>(TYPES.INtlmProxyMitm)
      .to(NtlmProxyMitm);
    this._container
      .bind<INtlmProxyServer>(TYPES.INtlmProxyServer)
      .to(NtlmProxyServer);
    this._container
      .bind<IPortsFileService>(TYPES.IPortsFileService)
      .to(PortsFileService);
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
      .bind<interfaces.Newable<IWinSsoFacade>>(TYPES.NewableIWinSsoFacade)
      .toConstructor<IWinSsoFacade>(WinSsoFacade);
  }

  get<T>(typename: symbol): T {
    return this._container.get(typename);
  }
}
