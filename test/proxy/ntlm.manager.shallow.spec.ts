// cSpell:ignore nisse, mnpwr, mptest
import 'reflect-metadata';
import 'mocha';
import { Substitute, SubstituteOf, Arg } from '@fluffy-spoon/substitute';

import { expect } from 'chai';
import { IConfigStore } from '../../src/proxy/interfaces/i.config.store';
import { IContext } from 'http-mitm-proxy';
import { IncomingMessage } from 'http';
import { IDebugLogger } from '../../src/util/interfaces/i.debug.logger';
import { DebugLogger } from '../../src/util/debug.logger';
import { NtlmManager } from '../../src/proxy/ntlm.manager';
import { toCompleteUrl } from '../../src/util/url.converter';
import { ConnectionContext } from '../../src/proxy/connection.context';
import { NtlmStateEnum } from '../../src/models/ntlm.state.enum';

describe('NtlmManager NTLM errors', () => {
  let ntlmManager: NtlmManager;
  let configStoreMock: SubstituteOf<IConfigStore>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();

  beforeEach(function () {
    configStoreMock = Substitute.for<IConfigStore>();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmManager = new NtlmManager(configStoreMock, debugMock);
  });

  it('Invalid credentials shall be logged and clear auth state', async function () {
    const message = Substitute.for<IncomingMessage>();
    const ctx = Substitute.for<IContext>();
    ctx.serverToProxyResponse.returns(message);
    message.statusCode.returns(401);
    const ntlmHostUrl = toCompleteUrl('http://www.google.com:8081', false);
    const connectionContext = new ConnectionContext();
    connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type3Sent);

    ntlmManager.ntlmHandshakeResponse(ctx, ntlmHostUrl, connectionContext, (err) => { if (err) throw err });
    debugMock.received(1).log('NTLM authentication failed, invalid credentials.');
    expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(NtlmStateEnum.NotAuthenticated);
  });

  it('Valid credentials shall set authenticated state', async function () {
    const message = Substitute.for<IncomingMessage>();
    const ctx = Substitute.for<IContext>();
    ctx.serverToProxyResponse.returns(message);
    message.statusCode.returns(200);
    const ntlmHostUrl = toCompleteUrl('http://www.google.com:8081', false);
    const connectionContext = new ConnectionContext();
    connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type3Sent);

    ntlmManager.ntlmHandshakeResponse(ctx, ntlmHostUrl, connectionContext, (err) => { if (err) throw err });
    expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(NtlmStateEnum.Authenticated);
  });

  it('Unexpected NTLM message shall be logged and clear auth state', async function () {
    const message = Substitute.for<IncomingMessage>();
    const ctx = Substitute.for<IContext>();
    ctx.serverToProxyResponse.returns(message);
    message.statusCode.returns(200);
    const ntlmHostUrl = toCompleteUrl('http://www.google.com:8081', false);
    const connectionContext = new ConnectionContext();
    connectionContext.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);

    ntlmManager.ntlmHandshakeResponse(ctx, ntlmHostUrl, connectionContext, (err) => { if (err) throw err });
    debugMock.received(1).log('Response from server in unexpected NTLM state ' + NtlmStateEnum.Type1Sent + ', resetting NTLM auth.');
    expect(connectionContext.getState(ntlmHostUrl)).to.be.equal(NtlmStateEnum.NotAuthenticated);
  });
});
