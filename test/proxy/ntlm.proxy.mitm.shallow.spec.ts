// cSpell:ignore nisse, mnpwr, mptest
import 'reflect-metadata';
import 'mocha';
import { Substitute, SubstituteOf, Arg } from '@fluffy-spoon/substitute';
import net from 'net';

import { expect } from 'chai';
import { IConfigStore } from '../../src/proxy/interfaces/i.config.store';
import { IConfigServer } from '../../src/proxy/interfaces/i.config.server';
import { IConnectionContextManager } from '../../src/proxy/interfaces/i.connection.context.manager';
import { INtlmManager } from '../../src/proxy/interfaces/i.ntlm.manager';
import { IUpstreamProxyManager } from '../../src/proxy/interfaces/i.upstream.proxy.manager';
import { NtlmProxyMitm } from '../../src/proxy/ntlm.proxy.mitm';
import { IContext } from '@bjowes/http-mitm-proxy';
import { IncomingMessage } from 'http';
import { IDebugLogger } from '../../src/util/interfaces/i.debug.logger';
import { DebugLogger } from '../../src/util/debug.logger';
import { ExpressServer } from './express.server';

describe('NtlmProxyMitm error logging', () => {
  let ntlmProxyMitm: NtlmProxyMitm;
  let configStoreMock: SubstituteOf<IConfigStore>;
  let configServerMock: SubstituteOf<IConfigServer>;
  let connectionContextManagerMock: SubstituteOf<IConnectionContextManager>;
  let ntlmManagerMock: SubstituteOf<INtlmManager>;
  let upstreamProxyManagerMock: SubstituteOf<IUpstreamProxyManager>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(function () {
    configStoreMock = Substitute.for<IConfigStore>();
    configServerMock = Substitute.for<IConfigServer>();
    connectionContextManagerMock = Substitute.for<IConnectionContextManager>();
    ntlmManagerMock = Substitute.for<INtlmManager>();
    upstreamProxyManagerMock = Substitute.for<IUpstreamProxyManager>();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyMitm = new NtlmProxyMitm(configStoreMock,
      configServerMock, connectionContextManagerMock, ntlmManagerMock,
      upstreamProxyManagerMock, debugMock);
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

  it('chrome startup connection tests (host without port) should not throw', function () {
    const error: NodeJS.ErrnoException = {
      message: 'testmessage',
      name: 'testname',
      code: 'ENOTFOUND'
    };
    const message = Substitute.for<IncomingMessage>();
    const ctx = Substitute.for<IContext>();
    ctx.clientToProxyRequest.returns(message);
    const mockHost = 'nctwerijlksf';
    message.headers.returns({host: mockHost});
    message.method.returns('HEAD');
    message.url.returns('/');

    ntlmProxyMitm.onError(ctx, error, 'PROXY_TO_SERVER_REQUEST_ERROR');
    debugMock.received(1).log('Chrome startup HEAD request detected (host: ' + mockHost + '). Ignoring connection error.');
  });

  it('chrome startup connection tests (host with port) should not throw', function () {
    const error: NodeJS.ErrnoException = {
      message: 'testmessage',
      name: 'testname',
      code: 'ENOTFOUND'
    };
    const message = Substitute.for<IncomingMessage>();
    const ctx = Substitute.for<IContext>();
    ctx.clientToProxyRequest.returns(message);
    const mockHost = 'nctwerijlksf:80';
    message.headers.returns({host: mockHost});
    message.method.returns('HEAD');
    message.url.returns('/');

    ntlmProxyMitm.onError(ctx, error, 'PROXY_TO_SERVER_REQUEST_ERROR');
    debugMock.received(1).log('Chrome startup HEAD request detected (host: ' + mockHost + '). Ignoring connection error.');
  });
});

describe('NtlmProxyMitm REQUEST', () => {
  let ntlmProxyMitm: NtlmProxyMitm;
  let configStoreMock: SubstituteOf<IConfigStore>;
  let configServerMock: SubstituteOf<IConfigServer>;
  let connectionContextManagerMock: SubstituteOf<IConnectionContextManager>;
  let ntlmManagerMock: SubstituteOf<INtlmManager>;
  let upstreamProxyManagerMock: SubstituteOf<IUpstreamProxyManager>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(async function () {
    configStoreMock = Substitute.for<IConfigStore>();
    configServerMock = Substitute.for<IConfigServer>();
    connectionContextManagerMock = Substitute.for<IConnectionContextManager>();
    ntlmManagerMock = Substitute.for<INtlmManager>();
    upstreamProxyManagerMock = Substitute.for<IUpstreamProxyManager>();

    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyMitm = new NtlmProxyMitm(configStoreMock,
      configServerMock, connectionContextManagerMock, ntlmManagerMock,
      upstreamProxyManagerMock, debugMock);
  });

  it('invalid url should throw', async function() {
    const message = Substitute.for<IncomingMessage>();
    const ctx = Substitute.for<IContext>();
    ctx.clientToProxyRequest.returns(message);
    message.headers.returns({hostMissing: 'test'});
    let callbackCount = 0;
    let callbackWithErrorCount = 0;
    await expect(() => ntlmProxyMitm.onRequest(ctx, (err: Error) => { callbackCount++; if (err) { callbackWithErrorCount++; throw err; } }))
      .throws('Invalid request - Could not read "host" header or "host" header refers to this proxy');
    expect(callbackCount).to.equal(1);
    expect(callbackWithErrorCount).to.equal(1);
  });

});

describe('NtlmProxyMitm CONNECT', () => {
  let ntlmProxyMitm: NtlmProxyMitm;
  let configStoreMock: SubstituteOf<IConfigStore>;
  let configServerMock: SubstituteOf<IConfigServer>;
  let connectionContextManagerMock: SubstituteOf<IConnectionContextManager>;
  let ntlmManagerMock: SubstituteOf<INtlmManager>;
  let upstreamProxyManagerMock: SubstituteOf<IUpstreamProxyManager>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  let httpsUrl: string;
  let urlNoProtocol: string;
  let socketMock: SubstituteOf<net.Socket>;
  let expressServer = new ExpressServer();

  let socketEventListener: (err: NodeJS.ErrnoException) => void;
  let serverStream: NodeJS.WritableStream;

  before(async function() {
    httpsUrl = await expressServer.startHttpsServer(false, undefined);
    urlNoProtocol = httpsUrl.substring(httpsUrl.indexOf('localhost'));
  });

  beforeEach(async function () {
    socketEventListener = undefined;
    serverStream = undefined;

    socketMock = Substitute.for<net.Socket>();
    socketMock.on(Arg.all()).mimicks((event: string, listener) => {
      if (event === 'error') {
        socketEventListener = listener;
      }
      return socketMock;
    });
    socketMock.write(Arg.all()).mimicks((data, encoding, callback) => {
      callback();
      return true;
    });
    socketMock.pipe(Arg.all()).mimicks((stream) => {
      serverStream = stream;
      return socketMock;
    });

    configStoreMock = Substitute.for<IConfigStore>();
    configStoreMock.exists(Arg.any()).returns(false);

    configServerMock = Substitute.for<IConfigServer>();
    connectionContextManagerMock = Substitute.for<IConnectionContextManager>();
    ntlmManagerMock = Substitute.for<INtlmManager>();
    upstreamProxyManagerMock = Substitute.for<IUpstreamProxyManager>();
    upstreamProxyManagerMock.hasHttpsUpstreamProxy(Arg.any()).returns(false);

    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyMitm = new NtlmProxyMitm(configStoreMock,
      configServerMock, connectionContextManagerMock, ntlmManagerMock,
      upstreamProxyManagerMock, debugMock);
  });

  after(async function() {
    await expressServer.stopHttpsServer();
  });

  it('invalid url should not throw', async function() {
    let req = Substitute.for<IncomingMessage>();
    req.url.returns(null);
    let callbackCount = 0;
    ntlmProxyMitm.onConnect(req, socketMock, '', (err: Error) => { callbackCount++; if (err) throw err; });
    expect(callbackCount).to.equal(1);
  });

  it('unknown socket error after connect should not throw', async function() {
    let req = Substitute.for<IncomingMessage>();
    req.url.returns(urlNoProtocol);
    const error: NodeJS.ErrnoException = {
      message: 'testmessage',
      name: 'testname',
      code: 'ENOTFOUND'
    };

    ntlmProxyMitm.onConnect(req, socketMock, '', (err: Error) => { if (err) throw err; });
    await waitForServerStream();
    socketEventListener.call(this, error);
    debugMock.received(1).log('Got unexpected error on ' + 'CLIENT_TO_PROXY_SOCKET. Target: ' + urlNoProtocol, error);
    serverStream.end();
  });

  it('ECONNRESET socket error after connect should not throw', async function() {
    let req = Substitute.for<IncomingMessage>();
    req.url.returns(urlNoProtocol);
    const error: NodeJS.ErrnoException = {
      message: 'testmessage',
      name: 'testname',
      code: 'ECONNRESET'
    };

    ntlmProxyMitm.onConnect(req, socketMock, '', (err: Error) => { if (err) throw err; });
    await waitForServerStream();
    socketEventListener.call(this, error);
    debugMock.received(1).log('Got ECONNRESET on ' + 'CLIENT_TO_PROXY_SOCKET' + ', ignoring. Target: ' + urlNoProtocol);
    serverStream.end();
  });

  it('unknown peer socket error after connect should not throw', async function() {
    let req = Substitute.for<IncomingMessage>();
    req.url.returns(urlNoProtocol);
    const error: NodeJS.ErrnoException = {
      message: 'testmessage',
      name: 'testname',
      code: 'ENOTFOUND'
    };

    ntlmProxyMitm.onConnect(req, socketMock, '', (err: Error) => { if (err) throw err; });
    await waitForServerStream();
    serverStream.emit('error', error);
    debugMock.received(1).log('Got unexpected error on ' + 'PROXY_TO_SERVER_SOCKET. Target: ' + urlNoProtocol, error);
    serverStream.end();
  });

  it('ECONNRESET peer socket error after connect should not throw', async function() {
    let req = Substitute.for<IncomingMessage>();
    req.url.returns(urlNoProtocol);
    const error: NodeJS.ErrnoException = {
      message: 'testmessage',
      name: 'testname',
      code: 'ECONNRESET'
    };

    ntlmProxyMitm.onConnect(req, socketMock, '', (err: Error) => { if (err) throw err; });
    await waitForServerStream();
    serverStream.emit('error', error);
    debugMock.received(1).log('Got ECONNRESET on ' + 'PROXY_TO_SERVER_SOCKET' + ', ignoring. Target: ' + urlNoProtocol);
    serverStream.end();
  });

  const sleepMs = (ms: number) => new Promise(res => setTimeout(res, ms));
  async function sleep(ms: number): Promise<void> {
    await sleepMs(ms);
  }

  async function waitForServerStream(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      for (let i = 0; i < 40; i++) {
        if (serverStream) {
          resolve();
        }
        await sleep(25);
      }
      reject();
    });
  }
});

describe('NtlmProxyMitm NtlmProxyPort', () => {
  let ntlmProxyMitm: NtlmProxyMitm;
  let configStoreMock: SubstituteOf<IConfigStore>;
  let configServerMock: SubstituteOf<IConfigServer>;
  let connectionContextManagerMock: SubstituteOf<IConnectionContextManager>;
  let ntlmManagerMock: SubstituteOf<INtlmManager>;
  let upstreamProxyManagerMock: SubstituteOf<IUpstreamProxyManager>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(async function () {
    configStoreMock = Substitute.for<IConfigStore>();
    configServerMock = Substitute.for<IConfigServer>();
    connectionContextManagerMock = Substitute.for<IConnectionContextManager>();
    ntlmManagerMock = Substitute.for<INtlmManager>();
    upstreamProxyManagerMock = Substitute.for<IUpstreamProxyManager>();

    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyMitm = new NtlmProxyMitm(configStoreMock,
      configServerMock, connectionContextManagerMock, ntlmManagerMock,
      upstreamProxyManagerMock, debugMock);
  });

  it('NtlmProxyPort should throw if not initialized', async function() {
    await expect(() => ntlmProxyMitm.NtlmProxyPort)
      .throws('Cannot get ntlmProxyPort, port has not been set!');
  });

  it('NtlmProxyPort should not throw if initialized', async function() {
    ntlmProxyMitm.NtlmProxyPort = "1234";
    expect(ntlmProxyMitm.NtlmProxyPort).to.be.equal("1234");
  });

});
