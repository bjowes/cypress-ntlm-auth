import * as awilix from 'awilix';

//const ndi = await import('node-dependency-injection');

//import type { ContainerBuilder } from 'node-dependency-injection';
//import {ContainerBuilder, Autowire} from 'node-dependency-injection'
//import {Definition} from 'node-dependency-injection'
import Ntlm from '../ntlm/ntlm.ts';
import CypressFacade from './cypress.facade.ts';
import UpstreamProxyConfigurator from './upstream.proxy.configurator.ts';
import Startup from './startup.ts';
import NtlmProxyFacade from './ntlm.proxy.facade.ts';
import Environment from './environment.ts';
import TlsCertValidator from '../util/tls.cert.validator.ts';
import DebugLogger from '../util/debug.logger.ts';
import ConsoleLogger from '../util/console.logger.ts';
import ConfigController from '../proxy/config.controller.ts';
import ConfigServer from '../proxy/config.server.ts';
import ConfigStore from '../proxy/config.store.ts';
import ConnectionContextManager from '../proxy/connection.context.manager.ts';
import CoreServer from '../proxy/core.server.ts';
import ExpressServerFacade from '../proxy/express.server.facade.ts';
import HttpMitmProxyFacade from '../proxy/http.mitm.proxy.facade.ts';
import HttpsValidation from '../proxy/https.validation.ts';
import Main from '../proxy/main.ts';
import NegotiateManager from '../proxy/negotiate.manager.ts';
import NtlmManager from '../proxy/ntlm.manager.ts';
import NtlmProxyMitm from '../proxy/ntlm.proxy.mitm.ts';
import NtlmProxyServer from '../proxy/ntlm.proxy.server.ts';
import PortsConfigStore from '../proxy/ports.config.store.ts';
import UpstreamProxyManager from '../proxy/upstream.proxy.manager.ts';
import WinSsoFacadeFactory from '../proxy/win-sso.facade.factory.ts';
import WinSsoFacade from '../proxy/win-sso.facade.ts';

export const DiTypes = {
    // NTLM
    ntlm: 'ntlm',

    // Startup
    cypressFacade: 'cypressFacade',
    environment: 'environment',
    ntlmProxyFacade: 'ntlmProxyFacade',
    startup: 'startup',
    upstreamProxyConfigurator: 'upstreamProxyConfigurator',

    // Proxy
    configController: 'configController',
    configServer: 'configServer',
    configStore: 'configStore',
    connectionContextManager: 'connectionContextManager',
    coreServer: 'coreServer',
    expressServerFacade: 'expressServerFacade',
    httpMitmProxyFacade: 'httpMitmProxyFacade',
    httpsValidation: 'httpsValidation',
    main: 'main',
    negotiateManager: 'negotiateManager',
    ntlmManager: 'ntlmManager',
    ntlmProxyMitm: 'ntlmProxyMitm',
    ntlmProxyServer: 'ntlmProxyServer',
    portsConfigStore: 'portsConfigStore',
    upstreamProxyManager: 'upstreamProxyManager',
    winSsoFacadeFactory: 'winSsoFacadeFactory',
    winSsoFacade: 'winSsoFacade',

    // Util
    consoleLogger: 'consoleLogger',
    debug: 'debug',
    tlsCertValidator: 'tlsCertValidator'
};

const container = awilix.createContainer({
    injectionMode: awilix.InjectionMode.CLASSIC,
    strict: true,
});

container.register({
    [DiTypes.ntlm]: awilix.asClass(Ntlm).scoped(),

    [DiTypes.configController]: awilix.asClass(ConfigController).scoped(),
    [DiTypes.configServer]: awilix.asClass(ConfigServer).scoped(),
    [DiTypes.configStore]: awilix.asClass(ConfigStore).scoped(),
    [DiTypes.connectionContextManager]: awilix.asClass(ConnectionContextManager).scoped(),
    [DiTypes.coreServer]: awilix.asClass(CoreServer).scoped(),
    [DiTypes.expressServerFacade]: awilix.asClass(ExpressServerFacade).scoped(),
    [DiTypes.httpMitmProxyFacade]: awilix.asClass(HttpMitmProxyFacade).scoped(),
    [DiTypes.httpsValidation]: awilix.asClass(HttpsValidation).scoped(),
    [DiTypes.main]: awilix.asClass(Main).scoped(),
    [DiTypes.negotiateManager]: awilix.asClass(NegotiateManager).scoped(),
    [DiTypes.ntlmManager]: awilix.asClass(NtlmManager).scoped(),
    [DiTypes.ntlmProxyMitm]: awilix.asClass(NtlmProxyMitm).scoped(),
    [DiTypes.ntlmProxyServer]: awilix.asClass(NtlmProxyServer).scoped(),
    [DiTypes.portsConfigStore]: awilix.asClass(PortsConfigStore).scoped(),
    [DiTypes.upstreamProxyManager]: awilix.asClass(UpstreamProxyManager).scoped(),
    [DiTypes.winSsoFacadeFactory]: awilix.asClass(WinSsoFacadeFactory).scoped(),
    [DiTypes.winSsoFacade]: awilix.asClass(WinSsoFacade).scoped(),

    [DiTypes.cypressFacade]: awilix.asClass(CypressFacade).scoped(),
    [DiTypes.environment]: awilix.asClass(Environment).scoped(),
    [DiTypes.ntlmProxyFacade]: awilix.asClass(NtlmProxyFacade).scoped(),
    [DiTypes.startup]: awilix.asClass(Startup).scoped(),
    [DiTypes.upstreamProxyConfigurator]: awilix.asClass(UpstreamProxyConfigurator).scoped(),

    [DiTypes.consoleLogger]: awilix.asClass(ConsoleLogger).singleton(),
    [DiTypes.debug]: awilix.asClass(DebugLogger).singleton(),
    [DiTypes.tlsCertValidator]: awilix.asClass(TlsCertValidator).scoped(),

});

export function CreateScopedContainer() : awilix.AwilixContainer {
    const scopedContainer = container.createScope();
    return scopedContainer;
    /*
    const container = awilix.CreateScopedContainer({
     injectionMode: awilix.InjectionMode.CLASSIC,
     strict: true,
    });

    container.register({
        [DiTypes.ntlm]: awilix.asClass(Ntlm).scoped(),

        [DiTypes.configController]: awilix.asClass(ConfigController).scoped(),
        [DiTypes.configServer]: awilix.asClass(ConfigServer).scoped(),
        [DiTypes.configStore]: awilix.asClass(ConfigStore).scoped(),
        [DiTypes.connectionContextManager]: awilix.asClass(ConnectionContextManager).scoped(),
        [DiTypes.coreServer]: awilix.asClass(CoreServer).scoped(),
        [DiTypes.expressServerFacade]: awilix.asClass(ExpressServerFacade).scoped(),
        [DiTypes.httpMitmProxyFacade]: awilix.asClass(HttpMitmProxyFacade).scoped(),
        [DiTypes.httpsValidation]: awilix.asClass(HttpsValidation).scoped(),
        [DiTypes.main]: awilix.asClass(Main).scoped(),
        [DiTypes.negotiateManager]: awilix.asClass(NegotiateManager).scoped(),
        [DiTypes.ntlmManager]: awilix.asClass(NtlmManager).scoped(),
        [DiTypes.ntlmProxyMitm]: awilix.asClass(NtlmProxyMitm).scoped(),
        [DiTypes.ntlmProxyServer]: awilix.asClass(NtlmProxyServer).scoped(),
        [DiTypes.portsConfigStore]: awilix.asClass(PortsConfigStore).scoped(),
        [DiTypes.upstreamProxyManager]: awilix.asClass(UpstreamProxyManager).scoped(),
        [DiTypes.winSsoFacadeFactory]: awilix.asClass(WinSsoFacadeFactory).scoped(),
        [DiTypes.winSsoFacade]: awilix.asClass(WinSsoFacade).scoped(),

        [DiTypes.cypressFacade]: awilix.asClass(CypressFacade).scoped(),
        [DiTypes.environment]: awilix.asClass(Environment).scoped(),
        [DiTypes.ntlmProxyFacade]: awilix.asClass(NtlmProxyFacade).scoped(),
        [DiTypes.startup]: awilix.asClass(Startup).scoped(),
        [DiTypes.upstreamProxyConfigurator]: awilix.asClass(UpstreamProxyConfigurator).scoped(),

        [DiTypes.consoleLogger]: awilix.asClass(ConsoleLogger).singleton(),
        [DiTypes.debug]: awilix.asClass(DebugLogger).singleton(),
        [DiTypes.tlsCertValidator]: awilix.asClass(TlsCertValidator).scoped(),

    });
    return container;
    */
    /*
    const absolutesrcPath = path.join(currentDir, pathToSrc);

    //const container = new ndi.ContainerBuilder(false, absolutesrcPath);
    const autowire = new ndi.Autowire(container);
    autowire.addExclude("ntlm/ntlm.message");
    autowire.addExclude("ntlm/type2.message");
    autowire.addExclude("ntlm/md4");
    autowire.addExclude("startup/dependency.injection");
    await autowire.process();

    
    console.log('Source path:', absolutesrcPath);
console.log('Exists:', fs.existsSync(absolutesrcPath));
console.log('Absolute:', path.isAbsolute(absolutesrcPath));
*/
/*
container.register('test.service', Ntlm);
*/
    //await container.compile({ validate: true });

    /*
    let definition = new Definition(...)
    definition.shared = false
*/

    //console.log(container);
    //console.log(container.definitions);

    /*
    console.log(container.exportGraph('json'));

    return container;
    */
}
