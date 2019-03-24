import http from 'http';
import https from 'https';
import url, { resolve } from 'url';
import httpMitmProxy from 'http-mitm-proxy';
import getPort from 'get-port';
import axios, { AxiosResponse } from 'axios';
import { NtlmConfig } from '../../src/models/ntlm.config.model';

export class ProxyFacade {
  // The MITM proxy takes a significant time to start the first time
  // due to cert generation, so we ensure this is done before the
  // tests are executed to avoid timeouts
  private _mitmProxyInit = false;
  private _mitmProxy: httpMitmProxy.IProxy = httpMitmProxy();

  async startMitmProxy(rejectUnauthorized: boolean): Promise<string> {
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
    //await this._mitmProxy.listen(mitmOptions); // TODO ???


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

  static async sendQuitCommand(configApiUrl: string, keepPortsFile: boolean): Promise<AxiosResponse<string>> {
    let res = await axios.post(configApiUrl + '/quit',
     { keepPortsFile: keepPortsFile }, { timeout: 15000 });
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
    let res = await axios.post(configApiUrl + '/ntlm-config',
      null, { timeout: 15000 });
    if (res.status !== 200) {
      throw new Error('Unexpected response status code on reset' + res.status);
    }
    return res;
  }

  static async sendRemoteRequest(ntlmProxyUrl: string, remoteHostWithPort: string, method: string, path: string, body: any): Promise<AxiosResponse<any>> {
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

  /*
  private sendProxiedHttpRequest(
    method: string, remoteHostUrl: string, path: string, proxyUrl: string, headers: any, bodyJson: string, callback) {
    headers['Host'] = remoteHostUrl.host;

    const proxyReq = http.request({
      method: method,
      path: path,
      host: proxyUrl.hostname,
      port: proxyUrl.port,
      timeout: 3000,
      headers: headers,
    }, (res) => {
      let responseBody;
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        if (!responseBody) {
          responseBody = chunk;
        } else {
          responseBody += chunk;
        }
      });
      res.on('end', function() {
        res.body = responseBody;
        return callback(res, null);
      });
    });
    proxyReq.on('error', (err) => {
      return callback(null, err);
    });
    if (bodyJson) {
      proxyReq.write(bodyJson);
    }
    proxyReq.end();

  }
  */
/*
  private sendProxiedHttpsRequest(
    method, remoteHostUrl, path, proxyUrl, headers, bodyJson, callback) {
    var connectReq = http.request({ // establishing a tunnel
      host: proxyUrl.hostname,
      port: proxyUrl.port,
      method: 'CONNECT',
      path: remoteHostUrl.host,
    });

    connectReq.on('connect', function(res, socket /*, head) {
      if (res.statusCode !== 200) {
        return callback(null, new Error('Unexpected response code on CONNECT', res.statusCode));
      }

      var req = https.request({
        method: method,
        path: path,
        host: remoteHostUrl.host,
        timeout: 3000,
        socket: socket, // using a tunnel
        agent: false,    // cannot use a default agent
        headers: headers,
        // We can ignore the self-signed certs on the testing webserver
        // Cypress will also ignore this
        rejectUnauthorized: false
      }, function(res) {
        let responseBody;
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
          if (!responseBody) {
            responseBody = chunk;
          } else {
            responseBody += chunk;
          }
        });
        res.on('end', function() {
          res.body = responseBody;
          return callback(res, null);
        });
      });

      req.on('error', (err) => {
        return callback(null, err);
      });

      if (bodyJson) {
        req.write(bodyJson);
      }
      req.end();
    });

    connectReq.on('error', (err) => {
      return callback(null, err);
    });
    connectReq.end();
  } */
};
