// cSpell:ignore nisse, mnpwr, mptest
import 'reflect-metadata';
import 'mocha';
import { Substitute, SubstituteOf, Arg } from '@fluffy-spoon/substitute';

import { expect } from 'chai';
import sinon from 'sinon';
import axios, { AxiosRequestConfig } from 'axios';

import { IDebugLogger } from '../../src/util/interfaces/i.debug.logger';
import { DebugLogger } from '../../src/util/debug.logger';
import { PortsFile } from '../../src/models/ports.file.model';
import { NtlmProxyExit } from '../../src/util/ntlm.proxy.exit';
import { IPortsFileService } from '../../src/util/interfaces/i.ports.file.service';

describe('NtlmProxyExit shallow', () => {
  let ntlmProxyExit: NtlmProxyExit;
  let portsFileServiceMock: SubstituteOf<IPortsFileService>;
  let debugMock: SubstituteOf<IDebugLogger>;
  let debugLogger = new DebugLogger();
  let httpRequestStub: sinon.SinonStub<[string, any?, (AxiosRequestConfig | undefined)?], Promise<{}>>;

  beforeEach(function () {
    portsFileServiceMock = Substitute.for<IPortsFileService>();
    debugMock = Substitute.for<IDebugLogger>();
    debugMock.log(Arg.all()).mimicks(debugLogger.log);
    ntlmProxyExit = new NtlmProxyExit(portsFileServiceMock, debugMock);
  });

  afterEach(function() {
    if (httpRequestStub) {
      httpRequestStub.restore();
    }
  });

  it('should send quit to existing proxy', async function () {
    httpRequestStub = sinon.stub(axios, 'post');
    let callUrl = '';
    let callBody = {};
    let callOptions = {};
    httpRequestStub.callsFake((url: string, body: any, options: any) => {
      callUrl = url;
      callBody = body;
      callOptions = options;
      return Promise.resolve({ status: 200 })
    });
    const portsFile = {
      configApiUrl: 'configApi',
      ntlmProxyUrl: 'ntlmProxy'
    } as PortsFile;
    portsFileServiceMock.exists().returns(true);
    portsFileServiceMock.parse().returns(portsFile);

    await ntlmProxyExit.quitIfRunning();

    expect(httpRequestStub.calledOnce).to.be.true;
    expect(callUrl).to.be.equal(portsFile.configApiUrl + '/quit');
    expect(callBody).to.be.deep.equal({ keepPortsFile: false });
    expect(callOptions).to.be.deep.equal({ timeout: 5000 });
    debugMock.received(1).log('ntlm-proxy-exit: Sending shutdown command to NTLM proxy');
  });

  it('should not send quit if no existing proxy', async function () {
    portsFileServiceMock.exists().returns(false);
    await ntlmProxyExit.quitIfRunning();
    debugMock.received(1).log('ntlm-proxy-exit: ntlm-proxy is not running, nothing to do.');
  });

  it('should throw if quit throws', async function () {
    httpRequestStub = sinon.stub(axios, 'post');
    httpRequestStub.callsFake(() => {
      return Promise.reject(new Error('test error'));
    });
    const portsFile = {
      configApiUrl: 'configApi',
      ntlmProxyUrl: 'ntlmProxy'
    } as PortsFile;
    portsFileServiceMock.exists().returns(true);
    portsFileServiceMock.parse().returns(portsFile);

    await expect(ntlmProxyExit.quitIfRunning()).to.be.rejectedWith('Shutdown request failed: ' + 'Error: test error');
    debugMock.received(1).log('ntlm-proxy-exit: Shutdown request failed: '+ 'Error: test error');
  });

  it('should throw if quit returns != 200', async function () {
    httpRequestStub = sinon.stub(axios, 'post');
    httpRequestStub.callsFake(() => {
      return Promise.resolve({ status: 404 });
    });
    const portsFile = {
      configApiUrl: 'configApi',
      ntlmProxyUrl: 'ntlmProxy'
    } as PortsFile;
    portsFileServiceMock.exists().returns(true);
    portsFileServiceMock.parse().returns(portsFile);

    await expect(ntlmProxyExit.quitIfRunning()).to.be.rejectedWith('Unexpected response from NTLM proxy: 404');
    debugMock.received(1).log('ntlm-proxy-exit: Unexpected response from NTLM proxy: 404');
  });

});
