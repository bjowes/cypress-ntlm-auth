import http from 'http';
import https from 'https';

import url from 'url';
import httpMitmProxy from 'http-mitm-proxy';
import getPort from 'get-port';
import axios, { AxiosResponse } from 'axios';
import tunnel from 'tunnel';
import fs from 'fs';
import path from 'path';

import { NtlmConfig } from '../../src/models/ntlm.config.model';

export class ProxyFacade {
  // The MITM proxy takes a significant time to start the first time
  // due to cert generation, so we ensure this is done before the
  // tests are executed to avoid timeouts
  private _mitmProxyInit = false;
  private _mitmProxy: httpMitmProxy.IProxy = httpMitmProxy();

  async startMitmProxy(rejectUnauthorized: boolean,
    requestCallback?: (ctx: httpMitmProxy.IContext, callback: (error?: Error) => void) => void): Promise<string> {
    let mitmOptions: httpMitmProxy.IProxyOptions = {
      host: 'localhost',
      port: undefined,
      keepAlive: true,
      forceSNI: false,
      httpAgent: new http.Agent({
        keepAlive: true
      }),
      httpsAgent: new https.Agent({
        keepAlive: true,
        rejectUnauthorized: rejectUnauthorized
      }),
    };

    this._mitmProxy = httpMitmProxy();
    let port = await getPort();
    mitmOptions.port = port;

    this._mitmProxy.onError(function (ctx, err, errorKind) {
      var url = (ctx && ctx.clientToProxyRequest) ? ctx.clientToProxyRequest.url : '';
      console.log('proxyFacade: ' + errorKind + ' on ' + url + ':', err);
    });

    if (requestCallback) {
      this._mitmProxy.onRequest(requestCallback);
    }

    await new Promise((resolve, reject) => this._mitmProxy.listen(mitmOptions, (err: Error) => {
      if (err) {
        reject(err);
      }
      resolve();
    }));

    return 'http://localhost:' + port;
  }

  stopMitmProxy() {
    this._mitmProxy.close();
  }

  async initMitmProxy() {
    if (this._mitmProxyInit) {
      return;
    }

    await this.startMitmProxy(false);
    this.stopMitmProxy();
    this._mitmProxyInit = true;
  }

  get mitmCaCert(): Buffer {
    const caCertPath = path.join(process.cwd(), '.http-mitm-proxy', 'certs', 'ca.pem');
    return fs.readFileSync(caCertPath);
  }

  static async sendQuitCommand(configApiUrl: string, keepPortsFile: boolean): Promise<AxiosResponse<string>> {
    let res = await axios.post(configApiUrl + '/quit',
     { keepPortsFile: keepPortsFile }, { timeout: 15000 });
    if (res.status !== 200) {
      throw new Error('Unexpected response from NTLM proxy: ' + res.status);
    }
    return res;
  }

  static async sendAliveRequest(configApiUrl: string): Promise<AxiosResponse<string>> {
    let res = await axios.get(configApiUrl + '/alive',
      { timeout: 15000 });
    if (res.status !== 200) {
      throw new Error('Unexpected response from NTLM proxy: ' + res.status);
    }
    return res;
  }

  static async sendNtlmConfig(configApiUrl: string, hostConfig: NtlmConfig): Promise<AxiosResponse<string>> {
    let res = await axios.post(configApiUrl + '/ntlm-config',
      hostConfig,
      {
        timeout: 15000,
        validateStatus: (status: number) => (status > 0) // Allow errors to pass through for test validation
      });
    return res;
  }

  static async sendNtlmReset(configApiUrl: string): Promise<AxiosResponse<string>> {
    let res = await axios.post(configApiUrl + '/reset',
      null, { timeout: 15000 });
    if (res.status !== 200) {
      throw new Error('Unexpected response status code on reset' + res.status);
    }
    return res;
  }

  static async sendRemoteRequest(ntlmProxyUrl: string, remoteHostWithPort: string, method: string, path: string, body: any, caCert?: Buffer): Promise<AxiosResponse<any>> {
    const remoteHostUrl = url.parse(remoteHostWithPort);
    if (remoteHostUrl.protocol === 'http:') {
      return await this.sendProxiedHttpRequest(ntlmProxyUrl, remoteHostWithPort, method, path, body);
    } else {
      return await this.sendProxiedHttpsRequest(ntlmProxyUrl, remoteHostWithPort, method, path, body, caCert);
    }
  }

  private static async sendProxiedHttpRequest(ntlmProxyUrl: string, remoteHostWithPort: string, method: string, path: string, body: any) {
    const proxyUrl = url.parse(ntlmProxyUrl);
    if (!proxyUrl.hostname || !proxyUrl.port) {
      throw new Error('Invalid proxy url');
    }

    let res = await axios.request({
      method: method,
      baseURL: remoteHostWithPort,
      url: path,
      proxy: {
        host: proxyUrl.hostname,
        port: +proxyUrl.port
      },
      timeout: 3000,
      data: body,
      validateStatus: (status: number) => (status > 0) // Allow errors to pass through for test validation
    });
    return res;
  }

  private static async sendProxiedHttpsRequest(ntlmProxyUrl: string, remoteHostWithPort: string, method: string, path: string, body: any, caCert?: Buffer) {
    const proxyUrl = url.parse(ntlmProxyUrl);
    if (!proxyUrl.hostname || !proxyUrl.port) {
      throw new Error('Invalid proxy url');
    }

    let ca: Buffer[] = [];
    if (caCert) {
      ca = [caCert];
    }

    const tun = tunnel.httpsOverHttp({
      proxy: {
          host: proxyUrl.hostname,
          port: +proxyUrl.port,
          headers: {
            'User-Agent': 'Node'
          }
      },
      ca: ca
    });

    let res = await axios.request({
      method: method,
      baseURL: remoteHostWithPort,
      url: path,
      httpsAgent: tun,
      proxy: false,
      timeout: 3000,
      data: body,

      validateStatus: (status: number) => (status > 0) // Allow errors to pass through for test validation
    });
    return res;
  }
};
