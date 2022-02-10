import * as http from "http";
import * as https from "https";

import httpMitmProxy from "http-mitm-proxy";

import getPort from "get-port";
import axios, { AxiosResponse, Method } from "axios";
import * as fs from "fs";
import * as path from "path";

import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";
import { PortsConfig } from "../../../src/models/ports.config.model";
import { httpsTunnel, TunnelAgent } from "../../../src/proxy/tunnel.agent";
import { Socket } from "node:net";

import debugInit from "debug";
import { URLExt } from "../../../src/util/url.ext";
const debug = debugInit("cypress:plugin:ntlm-auth:upstream-proxy");

export class ProxyFacade {
  // The MITM proxy takes a significant time to start the first time
  // due to cert generation, so we ensure this is done before the
  // tests are executed to avoid timeouts
  private _mitmProxyInit = false;
  private _mitmProxy?: httpMitmProxy.IProxy = undefined;
  private _httpAgent?: http.Agent;
  private _httpsAgent?: https.Agent;
  private _trackedSockets: {
    [key: string]: boolean;
  } = {};

  async startMitmProxy(
    rejectUnauthorized: boolean,
    requestCallback?: (ctx: httpMitmProxy.IContext, callback: (error?: Error) => void) => void
  ): Promise<string> {
    this._httpAgent = new http.Agent({
      keepAlive: true,
      maxSockets: 1,
    });
    this._httpsAgent = new https.Agent({
      keepAlive: true,
      maxSockets: 1,
      rejectUnauthorized: rejectUnauthorized,
    });
    let mitmOptions: httpMitmProxy.IProxyOptions = {
      host: "localhost",
      port: undefined,
      keepAlive: true,
      forceSNI: false,
      httpAgent: this._httpAgent,
      httpsAgent: this._httpsAgent,
    };
    this._trackedSockets = {};

    this._mitmProxy = httpMitmProxy();

    let port = await getPort();
    mitmOptions.port = port;

    this._mitmProxy.onError(function (ctx, err, errorKind) {
      let url = ctx && ctx.clientToProxyRequest ? ctx.clientToProxyRequest.url : "";
      debug(errorKind + " on " + url + ":", err);
    });

    let self = this;
    this._mitmProxy.onRequest(function (ctx, cb) {
      const targetHost = (ctx.clientToProxyRequest.headers.host as string) + ":";
      if (!self._trackedSockets[targetHost]) {
        self._trackedSockets[targetHost] = true;
        ctx.clientToProxyRequest.socket.once("close", function (hadError) {
          let destroyed = 0;
          function destroySocket(sockets: NodeJS.ReadOnlyDict<Socket[]>) {
            for (let key in sockets) {
              debug(key, targetHost);
              if (key.startsWith(targetHost)) {
                debug("match");
                sockets[key]!.forEach((socket) => {
                  socket.destroy();
                  destroyed++;
                });
              }
            }
          }
          function destroyAll(agent: http.Agent | https.Agent | undefined) {
            if (!agent) return;
            destroySocket(agent.sockets);
            destroySocket(agent.freeSockets);
          }
          destroyAll(self._httpAgent);
          destroyAll(self._httpsAgent);
          debug("detect client socket close " + targetHost + ", removed " + destroyed + " sockets from agents.");
          delete self._trackedSockets[targetHost];
        });
      }
      if (requestCallback) {
        return requestCallback(ctx, cb);
      }
      return cb();
    });

    await new Promise<void>((resolve, reject) =>
      this._mitmProxy!.listen(mitmOptions, (err: Error) => {
        if (err) {
          reject(err);
        }
        resolve();
      })
    );

    return "http://localhost:" + port;
  }

  stopMitmProxy() {
    if (this._mitmProxy) {
      this._mitmProxy.close();
      this._mitmProxy = undefined;
    }
    if (this._httpAgent) {
      this._httpAgent.destroy();
      this._httpAgent = undefined;
    }
    if (this._httpsAgent) {
      this._httpsAgent.destroy();
      this._httpsAgent = undefined;
    }
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
    agent?: http.Agent | TunnelAgent
  ): Promise<AxiosResponse<any>> {
    const remoteHostUrl = new URLExt(remoteHostWithPort);
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
    agent?: http.Agent | TunnelAgent
  ) {
    const proxyUrl = new URLExt(ntlmProxyUrl);
    if (!proxyUrl.hostname || !proxyUrl.portOrDefault) {
      throw new Error("Invalid proxy url");
    }

    let res = await axios.request({
      method: method,
      httpAgent: agent || new http.Agent({ keepAlive: false }),
      baseURL: remoteHostWithPort,
      url: path,
      proxy: {
        host: proxyUrl.hostname,
        port: proxyUrl.portOrDefault,
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
    agent?: http.Agent | TunnelAgent,
    caCert?: Buffer
  ) {
    const proxyUrl = new URLExt(ntlmProxyUrl);
    if (!proxyUrl.hostname || !proxyUrl.portOrDefault) {
      throw new Error("Invalid proxy url");
    }

    let ca: Buffer[] = [];
    if (caCert) {
      ca = [caCert];
    }

    const tunnelAgent =
      agent ||
      httpsTunnel({
        proxy: {
          host: proxyUrl.hostname,
          port: proxyUrl.portOrDefault,
          secureProxy: proxyUrl.protocol === "https:",
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

    if (!agent) {
      // Clean up internally created agent
      tunnelAgent.destroy();
    }
    return res;
  }
}
