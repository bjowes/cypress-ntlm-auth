// cSpell:ignore nisse, mnpwr, mptest
import 'reflect-metadata';
import 'mocha';
import { Substitute, SubstituteOf, Arg } from '@fluffy-spoon/substitute';

import { expect } from 'chai';
import http from 'http';
import { IConfigStore } from '../../src/proxy/interfaces/i.config.store';
import { IContext } from 'http-mitm-proxy';
import { IDebugLogger } from '../../src/util/interfaces/i.debug.logger';
import { DebugLogger } from '../../src/util/debug.logger';
import { NtlmManager } from '../../src/proxy/ntlm.manager';
import { toCompleteUrl } from '../../src/util/url.converter';
import { ConnectionContext } from '../../src/proxy/connection.context';
import { NtlmStateEnum } from '../../src/models/ntlm.state.enum';
import { ExpressServer } from './express.server';
import { NtlmConfig } from '../../src/models/ntlm.config.model';
import { NegotiateManager } from '../../src/proxy/negotiate.manager';
import { IWinSsoFacade } from '../../src/proxy/interfaces/i.win-sso.facade';

describe('NegotiateManager', () => {
  let negotiateManager: NegotiateManager;
  let winSsoFacadeMock: SubstituteOf<IWinSsoFacade>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();
  let expressServer = new ExpressServer();
  let httpUrl: string;

  before(async function() {
    httpUrl = await expressServer.startHttpServer(false, undefined);
  });

  beforeEach(async function () {
    winSsoFacadeMock = Substitute.for<IWinSsoFacade>();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    expressServer.sendNtlmType2(null);
    negotiateManager = new NegotiateManager(debugMock);
  });

  after(async function() {
    await expressServer.stopHttpServer();
  });

  describe('Negotiate errors', () => {
    it('Invalid credentials shall be logged and clear auth state', async function () {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(401);
      message.headers.returns({ 'www-authenticate': 'Negotiate TestToken '});
      const ntlmHostUrl = toCompleteUrl('http://www.google.com:8081', false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type3Sent);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthResponseHeader(Arg.any()).returns(null);

      negotiateManager['handshakeResponse'](message, ntlmHostUrl, connectionContext, {}, false, () => { return; });
      debugMock.received(1).log('Negotiate authentication failed for host, invalid credentials', 'http://www.google.com:8081/');
      expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(NtlmStateEnum.NotAuthenticated);
    });

    it('Valid credentials shall set authenticated state', async function () {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(200);
      message.headers.returns({ 'www-authenticate': 'Negotiate TestToken '});
      const ntlmHostUrl = toCompleteUrl('http://www.google.com:8081', false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type3Sent);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthResponseHeader(Arg.any()).returns(null);

      negotiateManager['handshakeResponse'](message, ntlmHostUrl, connectionContext, {}, false, () => { return; });
      debugMock.received(1).log('Negotiate authentication successful for host', 'http://www.google.com:8081/');
      expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(NtlmStateEnum.Authenticated);
    });

    it('Response without Negotiate header shall be logged and clear auth state', async function () {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(200);
      message.headers.returns({ 'www-authenticate': 'Basic'});
      const ntlmHostUrl = toCompleteUrl('http://www.google.com:8081', false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthResponseHeader(Arg.any()).returns(null);

      negotiateManager['handshakeResponse'](message, ntlmHostUrl, connectionContext, {}, false, (err, res) => {
        expect(err).to.not.be.null;
        expect(err.message).to.be.equal('www-authenticate not found on response of request during Negotiate handshake with host http://www.google.com:8081/');
      });
      debugMock.received(1).log('www-authenticate not found on response during Negotiate handshake with host', 'http://www.google.com:8081/');
      expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(NtlmStateEnum.NotAuthenticated);
    });

    it('Response without www-authenticate header shall be logged and clear auth state', async function () {
      const message = Substitute.for<http.IncomingMessage>();
      message.statusCode.returns(200);
      message.headers.returns({});
      const ntlmHostUrl = toCompleteUrl('http://www.google.com:8081', false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthResponseHeader(Arg.any()).returns(null);

      negotiateManager['handshakeResponse'](message, ntlmHostUrl, connectionContext, {}, false, (err, res) => {
        expect(err).to.not.be.null;
        expect(err.message).to.be.equal('www-authenticate not found on response of request during Negotiate handshake with host http://www.google.com:8081/');
      });
      debugMock.received(1).log('www-authenticate not found on response during Negotiate handshake with host', 'http://www.google.com:8081/');
      expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(NtlmStateEnum.NotAuthenticated);
    });

    it('Cannot create Negotiate request token', function (done) {
      const ntlmHostUrl = toCompleteUrl(httpUrl, false);
      const connectionContext = new ConnectionContext();
      connectionContext.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
      connectionContext.winSso = winSsoFacadeMock;
      winSsoFacadeMock.createAuthRequestHeader().mimicks(() => { throw new Error('test'); });
      const ctx = Substitute.for<IContext>();
      ctx.proxyToServerRequestOptions.returns({} as any);
      ctx.isSSL.returns(false);

      negotiateManager.handshake(ctx, toCompleteUrl(httpUrl, false), connectionContext,
        (err, res) => {
          expect(err.message).to.be.equal('Cannot parse NTLM message type 2 from host ' + ntlmHostUrl.href + ntlmHostUrl.path);
          expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(NtlmStateEnum.NotAuthenticated);
          return done();
        });
    });

    it.skip('Error sending Negotiate message', function (done) {
    });

    describe('Negotiate detection', () => {
      it('should not detect lowercase Negotiate in header', function() {
        let res = Substitute.for<http.IncomingMessage>();
        res.headers.returns({ 'www-authenticate': 'negotiate' });
        let result = negotiateManager.acceptsNegotiateAuthentication(res);
        expect(result).to.be.false;
      });

      it('should not detect uppercase Negotiate in header', function() {
        let res = Substitute.for<http.IncomingMessage>();
        res.headers.returns({ 'www-authenticate': 'NEGOTIATE' });
        let result = negotiateManager.acceptsNegotiateAuthentication(res);
        expect(result).to.be.false;
      });

      it('should detect proper case Negotiate in header', function() {
        let res = Substitute.for<http.IncomingMessage>();
        res.headers.returns({ 'www-authenticate': 'Negotiate' });
        let result = negotiateManager.acceptsNegotiateAuthentication(res);
        expect(result).to.be.true;
      });

      it('should detect Negotiate in mixed header', function() {
        let res = Substitute.for<http.IncomingMessage>();
        res.headers.returns({ 'www-authenticate': 'NTLM, Negotiate' });
        let result = negotiateManager.acceptsNegotiateAuthentication(res);
        expect(result).to.be.true;
      });

      it('should not detect missing Negotiate', function() {
        let res = Substitute.for<http.IncomingMessage>();
        res.headers.returns({ 'www-authenticate': 'NTLM, Digest' });
        let result = negotiateManager.acceptsNegotiateAuthentication(res);
        expect(result).to.be.false;
      });
    });
  });

});
