// cSpell:ignore nisse, mnpwr, mptest
import 'reflect-metadata';
import 'mocha';
import { Substitute, SubstituteOf, Arg } from '@fluffy-spoon/substitute';

import { expect } from 'chai';
import { ConfigServer } from '../../src/proxy/config.server';
import { IConfigController } from '../../src/proxy/interfaces/i.config.controller';
import { IExpressServerFacade } from '../../src/proxy/interfaces/i.express.server.facade';
import { IDebugLogger } from '../../src/util/interfaces/i.debug.logger';
import { DebugLogger } from '../../src/util/debug.logger';

describe('ConfigServer', () => {
  let configServer: ConfigServer;
  let configControllerMock: SubstituteOf<IConfigController>;
  let expressServerMock: SubstituteOf<IExpressServerFacade>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(function () {
    configControllerMock = Substitute.for<IConfigController>();
    expressServerMock = Substitute.for<IExpressServerFacade>();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    configServer = new ConfigServer(expressServerMock, configControllerMock, debugMock);
  });

  it('configApiUrl should throw if start has not been called', async function () {
    await expect(() => configServer.configApiUrl).to.throw('Cannot get configApiUrl, ConfigServer not started!');
  });

  it('configApiUrl should return url with assigned port', async function () {
    expressServerMock.listen(2000).returns(Promise.resolve('http://127.0.0.1:2000'));

    await configServer.start(2000);

    expressServerMock.received(1).listen(2000);
    expect(configServer.configApiUrl).to.be.equal('http://127.0.0.1:2000');
  });

  it('start should use a free port if undefined', async function () {
    let listenPort: any;
    expressServerMock.listen(Arg.all()).mimicks((port: any) => { listenPort = port; return Promise.resolve('http://127.0.0.1:' + port); });

    await configServer.start();
    expressServerMock.received(1).listen(Arg.any());
    expect(listenPort).to.be.greaterThan(0);
    expect(configServer.configApiUrl).to.contain('http://127.0.0.1:' + listenPort);
  });

  it('start should call init', async function () {
    expressServerMock.listen(Arg.any()).returns(Promise.resolve('http://127.0.0.1:2000'));

    await configServer.start();

    expressServerMock.received(1).use(Arg.any(), Arg.any());
  });

  it('start should throw if listen fails', async function () {
    expressServerMock.listen(Arg.all()).mimicks((port: any) => { return Promise.reject('test'); } );

    await expect(configServer.start()).to.be.rejectedWith('test');
  });

  it('init should just initialize once', function () {
    configServer.init();
    expressServerMock.received(1).use(Arg.any(), Arg.any());

    configServer.init();
    expressServerMock.received(1).use(Arg.any(), Arg.any());
  });

  it('stop should close server listener', async function () {
    expressServerMock.listen(Arg.any()).returns(Promise.resolve('http://127.0.0.1:2000'));
    expressServerMock.close().returns(Promise.resolve());
    await configServer.start();
    await configServer.stop();
    expressServerMock.received(1).close();
  });

  it('stop should throw if close fail', async function () {
    expressServerMock.listen(Arg.any()).returns(Promise.resolve('http://127.0.0.1:2000'));
    expressServerMock.close().returns(Promise.reject('test'));
    await configServer.start();
    await expect(configServer.stop()).to.be.rejectedWith('test');
  });
});
