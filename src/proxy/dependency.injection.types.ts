export let TYPES = {
  IConfigController: Symbol.for('IConfigController'),
  IConfigServer: Symbol.for('IConfigServer'),
  IConfigStore: Symbol.for('IConfigStore'),
  IConnectionContextManager: Symbol.for('IConnectionContextManager'),
  ICoreServer: Symbol.for('ICoreServer'),
  IDebugLogger: Symbol.for('IDebugLogger'),
  IExpressServerFacade: Symbol.for('IExpressServerFacade'),
  IHttpMitmProxyFacade: Symbol.for('IHttpMitmProxyFacade'),
  INtlmManager: Symbol.for('INtlmManager'),
  INtlmProxyMitm: Symbol.for('INtlmProxyMitm'),
  INtlmProxyServer: Symbol.for('INtlmProxyServer'),
  IPortsFileService: Symbol.for('IPortsFileService'),
  IUpstreamProxyManager: Symbol.for('IUpstreamProxyManager'),
  NewableIConnectionContext: Symbol.for('Newable<IConnectionContext>')
};
