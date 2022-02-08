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
import { httpsTunnel, TunnelingAgent } from "../../../src/proxy/tunnel.agent";
import { Socket } from "node:net";

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
      console.log("proxyFacade: " + errorKind + " on " + url + ":", err);
    });

    // TODO: on request, register close event handler on client socket.
    // close event triggers a callback with the target (host:port) as parameter
    // find the matching socket in the agent (search in sockets and freeSockets)
    // emit the "remove" event on the socket -> will remove it from the agent

    // For the tunnel agent, similar feature is required. Support for remove and perform remove
    // on socket error/close/timeout for freeSockets.

    let self = this;
    this._mitmProxy.onRequest(function (ctx, cb) {
      const targetHost = (ctx.clientToProxyRequest.headers.host as string) + ":";
      if (!self._trackedSockets[targetHost]) {
        self._trackedSockets[targetHost] = true;
        ctx.clientToProxyRequest.socket.once("close", function (hadError) {
          let destroyed = 0;
          function destroySocket(sockets: NodeJS.ReadOnlyDict<Socket[]>) {
            for (let key in sockets) {
              console.log(key, targetHost);
              if (key.startsWith(targetHost)) {
                console.log("match");
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
          console.log(
            "upstream proxy: detect client socket close " +
              targetHost +
              ", removed " +
              destroyed +
              " sockets from agents."
          );
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

    // This generates the localhost cert and key before starting the tests,
    // since this step is fairly slow on Node 8 the runtime of the actual tests are
    // more predictable this way.
    //await this.preGenerateCertificate("localhost");
    // TODO is this fast enough now?

    this._mitmProxyInit = true;
  }

  /*
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
  */

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
    agent?: http.Agent | TunnelingAgent
  ): Promise<AxiosResponse<any>> {
    const remoteHostUrl = new URL(remoteHostWithPort);
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
    agent?: http.Agent | TunnelingAgent
  ) {
    const proxyUrl = new URL(ntlmProxyUrl);
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
    agent?: http.Agent | TunnelingAgent,
    caCert?: Buffer
  ) {
    const proxyUrl = new URL(ntlmProxyUrl);
    if (!proxyUrl.hostname || !proxyUrl.port) {
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
          port: +proxyUrl.port,
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
