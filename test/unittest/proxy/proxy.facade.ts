import http from "http";
import https from "https";

import url from "url";
import httpMitmProxy from "http-mitm-proxy";
const CA = require("http-mitm-proxy/lib/ca");

const getPort = require("get-port");
import axios, { AxiosResponse, Method } from "axios";
const kapAgent = require("keepalive-proxy-agent");
import fs from "fs";
import path from "path";

import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";
import { PortsConfig } from "../../../src/models/ports.config.model";

export class ProxyFacade {
  // The MITM proxy takes a significant time to start the first time
  // due to cert generation, so we ensure this is done before the
  // tests are executed to avoid timeouts
  private _mitmProxyInit = false;
  private _mitmProxy: httpMitmProxy.IProxy = httpMitmProxy();

  async startMitmProxy(
    rejectUnauthorized: boolean,
    requestCallback?: (ctx: httpMitmProxy.IContext, callback: (error?: Error) => void) => void
  ): Promise<string> {
    let mitmOptions: httpMitmProxy.IProxyOptions = {
      host: "localhost",
      port: undefined,
      keepAlive: true,
      forceSNI: false,
      httpAgent: new http.Agent({
        keepAlive: true,
      }),
      httpsAgent: new https.Agent({
        keepAlive: true,
        rejectUnauthorized: rejectUnauthorized,
      }),
    };

    this._mitmProxy = httpMitmProxy();
    let port = await getPort();
    mitmOptions.port = port;

    this._mitmProxy.onError(function (ctx, err, errorKind) {
      let url = ctx && ctx.clientToProxyRequest ? ctx.clientToProxyRequest.url : "";
      console.log("proxyFacade: " + errorKind + " on " + url + ":", err);
    });

    if (requestCallback) {
      this._mitmProxy.onRequest(requestCallback);
    }

    await new Promise<void>((resolve, reject) =>
      this._mitmProxy.listen(mitmOptions, (err: Error) => {
        if (err) {
          reject(err);
        }
        resolve();
      })
    );

    return "http://localhost:" + port;
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

    // This generates the localhost cert and key before starting the tests,
    // since this step is fairly slow on Node 8 the runtime of the actual tests are
    // more predictable this way.
    await this.preGenerateCertificate("localhost");

    this._mitmProxyInit = true;
  }

  private preGenerateCertificate(host: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sslCaDir = path.resolve(process.cwd(), ".http-mitm-proxy");
      CA.create(sslCaDir, function (err: NodeJS.ErrnoException, ca: any) {
        if (err) {
          return reject(err);
        }
        ca.generateServerCertificateKeys([host], function (key: string, cert: string) {
          return resolve();
        });
      });
    });
  }

  get mitmCaCert(): Buffer {
    const caCertPath = path.join(process.cwd(), ".http-mitm-proxy", "certs", "ca.pem");
    return fs.readFileSync(caCertPath);
  }

  static async sendQuitCommand(configApiUrl: string, keepPortsFile: boolean): Promise<AxiosResponse<string>> {
    let res = await axios.post(configApiUrl + "/quit", { keepPortsFile: keepPortsFile }, { timeout: 15000 });
    if (res.status !== 200) {
      throw new Error("Unexpected response from NTLM proxy: " + res.status);
    }
    return res;
  }

  static async sendAliveRequest(configApiUrl: string): Promise<AxiosResponse<PortsConfig>> {
    let res = await axios.get<PortsConfig>(configApiUrl + "/alive", {
      timeout: 15000,
    });
    if (res.status !== 200) {
      throw new Error("Unexpected response from NTLM proxy: " + res.status);
    }
    return res;
  }

  static async sendNtlmConfig(
    configApiUrl: string,
    hostConfig: NtlmConfig,
    timeout?: number
  ): Promise<AxiosResponse<string>> {
    let res = await axios.post(configApiUrl + "/ntlm-config", hostConfig, {
      timeout: timeout,
      validateStatus: (status: number) => status > 0, // Allow errors to pass through for test validation
    });
    return res;
  }

  static async sendNtlmSsoConfig(
    configApiUrl: string,
    ssoConfig: NtlmSsoConfig,
    timeout?: number
  ): Promise<AxiosResponse<string>> {
    let res = await axios.post(configApiUrl + "/ntlm-sso", ssoConfig, {
      timeout: timeout,
      validateStatus: (status: number) => status > 0, // Allow errors to pass through for test validation
    });
    return res;
  }

  static async sendNtlmReset(configApiUrl: string): Promise<AxiosResponse<string>> {
    let res = await axios.post(configApiUrl + "/reset", null, {
      timeout: 15000,
    });
    if (res.status !== 200) {
      throw new Error("Unexpected response status code on reset" + res.status);
    }
    return res;
  }

  static async sendRemoteRequest(
    ntlmProxyUrl: string,
    remoteHostWithPort: string,
    method: Method,
    path: string,
    body: any,
    caCert?: Buffer,
    agent?: http.Agent
  ): Promise<AxiosResponse<any>> {
    const remoteHostUrl = url.parse(remoteHostWithPort);
    if (remoteHostUrl.protocol === "http:") {
      return await this.sendProxiedHttpRequest(ntlmProxyUrl, remoteHostWithPort, method, path, body, agent);
    } else {
      return await this.sendProxiedHttpsRequest(ntlmProxyUrl, remoteHostWithPort, method, path, body, agent, caCert);
    }
  }

  private static async sendProxiedHttpRequest(
    ntlmProxyUrl: string,
    remoteHostWithPort: string,
    method: Method,
    path: string,
    body: any,
    agent?: http.Agent
  ) {
    const proxyUrl = url.parse(ntlmProxyUrl);
    if (!proxyUrl.hostname || !proxyUrl.port) {
      throw new Error("Invalid proxy url");
    }

    let res = await axios.request({
      method: method,
      httpAgent: agent || new http.Agent({ keepAlive: false }),
      baseURL: remoteHostWithPort,
      url: path,
      proxy: {
        host: proxyUrl.hostname,
        port: +proxyUrl.port,
      },
      timeout: 5000,
      data: body,
      validateStatus: (status: number) => status > 0, // Allow errors to pass through for test validation
    });
    return res;
  }

  private static async sendProxiedHttpsRequest(
    ntlmProxyUrl: string,
    remoteHostWithPort: string,
    method: Method,
    path: string,
    body: any,
    agent?: http.Agent,
    caCert?: Buffer
  ) {
    const proxyUrl = url.parse(ntlmProxyUrl);
    if (!proxyUrl.hostname || !proxyUrl.port) {
      throw new Error("Invalid proxy url");
    }

    let ca: Buffer[] = [];
    if (caCert) {
      ca = [caCert];
    }

    const tunnelAgent =
      agent ||
      new kapAgent({
        proxy: {
          hostname: proxyUrl.hostname,
          port: +proxyUrl.port,
          headers: {
            "User-Agent": "Node",
          },
        },
        ca: ca,
        keepAlive: false,
      });

    let res = await axios.request({
      method: method,
      baseURL: remoteHostWithPort,
      url: path,
      httpsAgent: tunnelAgent,
      proxy: false,
      timeout: 5000,
      data: body,

      validateStatus: (status: number) => status > 0, // Allow errors to pass through for test validation
    });
    return res;
  }
}
