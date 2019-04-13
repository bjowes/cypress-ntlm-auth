// cSpell:ignore nisse, mnpwr, mptest
import 'reflect-metadata';
import 'mocha';
import { Substitute, SubstituteOf, Arg } from '@fluffy-spoon/substitute';

import { expect } from 'chai';
import { IConfigStore } from '../../src/proxy/interfaces/i.config.store';
import { IConfigServer } from '../../src/proxy/interfaces/i.config.server';
import { IConnectionContextManager } from '../../src/proxy/interfaces/i.connection.context.manager';
import { INtlmManager } from '../../src/proxy/interfaces/i.ntlm.manager';
import { IUpstreamProxyManager } from '../../src/proxy/interfaces/i.upstream.proxy.manager';
import { NtlmProxyMitm } from '../../src/proxy/ntlm.proxy.mitm';
import { IContext } from 'http-mitm-proxy';
import { IncomingMessage } from 'http';
import { IDebugLogger } from '../../src/util/interfaces/i.debug.logger';

describe('NtlmProxyMitm', () => {
  let ntlmProxyMitm: NtlmProxyMitm;
  let configStoreMock: SubstituteOf<IConfigStore>;
  let configServerMock: SubstituteOf<IConfigServer>;
  let connectionContextManagerMock: SubstituteOf<IConnectionContextManager>;
  let ntlmManagerMock: SubstituteOf<INtlmManager>;
  let upstreamProxyManagerMock: SubstituteOf<IUpstreamProxyManager>;
  let debugMock: SubstituteOf<IDebugLogger>;

  beforeEach(function () {
    configStoreMock = Substitute.for<IConfigStore>();
    configServerMock = Substitute.for<IConfigServer>();
    connectionContextManagerMock = Substitute.for<IConnectionContextManager>();
    ntlmManagerMock = Substitute.for<INtlmManager>();
    upstreamProxyManagerMock = Substitute.for<IUpstreamProxyManager>();
    debugMock = Substitute.for<IDebugLogger>();
    ntlmProxyMitm = new NtlmProxyMitm(configStoreMock,
      configServerMock, connectionContextManagerMock, ntlmManagerMock, upstreamProxyManagerMock, debugMock);
  });

  it('connection errors should not throw when no context', async function () {
    const error: NodeJS.ErrnoException = {
      message: 'testmessage',
      name: 'testname',
      code: 'code'
    };
    ntlmProxyMitm.onError(undefined, error, 'SOME');
    debugMock.received(1).log('SOME' + ' on ' + '' + ':', error);
  });

  it('connection errors should not throw when no clientToProxyRequest in context', async function () {
    const error: NodeJS.ErrnoException = {
      message: 'testmessage',
      name: 'testname',
      code: 'code'
    };
    const ctx = Substitute.for<IContext>();
    ctx.clientToProxyRequest.returns(undefined);
    ntlmProxyMitm.onError(ctx, error, 'SOME');
    debugMock.received(1).log('SOME' + ' on ' + '' + ':', error);
  });

  it('connection errors should log to debug', async function () {
    const error: NodeJS.ErrnoException = {
      message: 'testmessage',
      name: 'testname',
      code: 'code'
    };
    const message = Substitute.for<IncomingMessage>();
    const ctx = Substitute.for<IContext>();
    ctx.clientToProxyRequest.returns(message);
    message.url.returns('/testurl');
    ntlmProxyMitm.onError(ctx, error, 'SOME');
    debugMock.received(1).log('SOME' + ' on ' + '/testurl' + ':', error);
  });

  it('chrome startup connection tests should not throw', async function () {
    const error: NodeJS.ErrnoException = {
      message: 'testmessage',
      name: 'testname',
      code: 'ENOTFOUND'
    };
    const message = Substitute.for<IncomingMessage>();
    const ctx = Substitute.for<IContext>();
    ctx.clientToProxyRequest.returns(message);
    const mockHost = 'nctwerijlksf'
    message.headers.returns({host: mockHost});
    message.method.returns('HEAD');
    message.url.returns('/');

    ntlmProxyMitm.onError(ctx, error, 'PROXY_TO_SERVER_REQUEST_ERROR');
    debugMock.received(1).log('Chrome startup HEAD request detected (host: ' + mockHost + '). Ignoring connection error.')
  });
/*
  it('ntlmProxyUrl should return url with assigned port', async function () {
    httpMitmProxyMock.listen(2000).returns(Promise.resolve('http://127.0.0.1:2000'));

    await ntlmProxyServer.start(2000);

    httpMitmProxyMock.received(1).listen(2000);
    expect(ntlmProxyServer.ntlmProxyUrl).to.be.equal('http://127.0.0.1:2000');
  });

  it('start should use a free port if undefined', async function () {
    let listenPort: any;
    httpMitmProxyMock.listen(Arg.all()).mimicks((port: any) => { listenPort = port; return Promise.resolve('http://127.0.0.1:' + port)})

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
    httpMitmProxyMock.listen(Arg.all()).mimicks((port: any) => { return Promise.reject('test')} )

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
    httpMitmProxyMock.close().mimicks(() => { throw new Error('test') });
    await ntlmProxyServer.start();
    expect(() => ntlmProxyServer.stop()).to.throw('test');
  });
  */
});
