// cSpell:ignore nisse, mnpwr, mptest
import 'reflect-metadata';
import 'mocha';
import { Substitute, SubstituteOf, Arg } from '@fluffy-spoon/substitute';

import { expect } from 'chai';
import { NtlmProxyServer } from '../../src/proxy/ntlm.proxy.server';
import { INtlmProxyMitm } from '../../src/proxy/interfaces/i.ntlm.proxy.mitm';
import { IHttpMitmProxyFacade } from '../../src/proxy/interfaces/i.http.mitm.proxy.facade';
import { IDebugLogger } from '../../src/util/interfaces/i.debug.logger';
import { DebugLogger } from '../../src/util/debug.logger';

describe('NtlmProxyServer', () => {
  let ntlmProxyServer: NtlmProxyServer;
  let ntlmProxyMitmMock: SubstituteOf<INtlmProxyMitm>;
  let httpMitmProxyMock: SubstituteOf<IHttpMitmProxyFacade>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(function () {
    ntlmProxyMitmMock = Substitute.for<INtlmProxyMitm>();
    httpMitmProxyMock = Substitute.for<IHttpMitmProxyFacade>();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyServer = new NtlmProxyServer(ntlmProxyMitmMock, httpMitmProxyMock, debugMock);
  });

  it('ntlmProxyUrl should throw if start has not been called', async function () {
    await expect(() => ntlmProxyServer.ntlmProxyUrl).to.throw('Cannot get ntlmProxyUrl, NtlmProxyServer not started!');
  });

  it('ntlmProxyUrl should return url with assigned port', async function () {
    httpMitmProxyMock.listen(2000).returns(Promise.resolve('http://127.0.0.1:2000'));

    await ntlmProxyServer.start(2000);

    httpMitmProxyMock.received(1).listen(2000);
    expect(ntlmProxyServer.ntlmProxyUrl).to.be.equal('http://127.0.0.1:2000');
  });

  it('start should use a free port if undefined', async function () {
    let listenPort: any;
    httpMitmProxyMock.listen(Arg.all()).mimicks((port: any) => { listenPort = port; return Promise.resolve('http://127.0.0.1:' + port); });

    await ntlmProxyServer.start();
    httpMitmProxyMock.received(1).listen(Arg.any());
    expect(listenPort).to.be.greaterThan(0);
    expect(ntlmProxyServer.ntlmProxyUrl).to.contain('http://127.0.0.1:' + listenPort);
  });

  it('start should call init', async function () {
    httpMitmProxyMock.listen(Arg.any()).returns(Promise.resolve('http://127.0.0.1:2000'));

    await ntlmProxyServer.start();

    httpMitmProxyMock.received(1).use(Arg.any());
  });

  it('start should throw if listen fails', async function () {
    httpMitmProxyMock.listen(Arg.all()).mimicks((port: any) => { return Promise.reject('test'); } );

    await expect(ntlmProxyServer.start()).to.be.rejectedWith('test');
  });

  it('init should just initialize once', function () {
    ntlmProxyServer.init();
    httpMitmProxyMock.received(1).use(Arg.any());

    ntlmProxyServer.init();
    httpMitmProxyMock.received(1).use(Arg.any());
  });

  it('stop should close server listener', async function () {
    httpMitmProxyMock.listen(Arg.any()).returns(Promise.resolve('http://127.0.0.1:2000'));
    await ntlmProxyServer.start();
    await ntlmProxyServer.stop();
    httpMitmProxyMock.received(1).close();
  });

  it('stop should throw if close throws', async function () {
    httpMitmProxyMock.listen(Arg.any()).returns(Promise.resolve('http://127.0.0.1:2000'));
    httpMitmProxyMock.close().mimicks(() => { throw new Error('test'); });
    await ntlmProxyServer.start();
    expect(() => ntlmProxyServer.stop()).to.throw('test');
  });
});
