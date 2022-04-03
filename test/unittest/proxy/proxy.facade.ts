import * as http from "http";
import * as https from "https";

import httpMitmProxy from "@bjowes/http-mitm-proxy";

import * as fs from "fs";
import * as path from "path";

import { NtlmConfig } from "../../../src/models/ntlm.config.model";
import { NtlmSsoConfig } from "../../../src/models/ntlm.sso.config.model";
import { httpsTunnel, TunnelAgent } from "../../../src/proxy/tunnel.agent";
import { Socket } from "net";

import debugInit from "debug";
import { URLExt } from "../../../src/util/url.ext";
import { HttpClient, HttpResponse } from "./http.client";
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
    requestCallback?: (
      ctx: httpMitmProxy.IContext,
      callback: (error?: Error) => void
    ) => void
  ): Promise<URL> {
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

    mitmOptions.port = 0;

    this._mitmProxy.onError(function (ctx, err, errorKind) {
      let url =
        ctx && ctx.clientToProxyRequest ? ctx.clientToProxyRequest.url : "";
      debug(errorKind + " on " + url + ":", err);
    });

    let self = this;
    this._mitmProxy.onRequest(function (ctx, cb) {
      function unescapeHost(host: string) {
        return host.replace("[", "").replace("]", "");
      }
      const targetHost =
        unescapeHost(ctx.clientToProxyRequest.headers.host!) + ":";
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
          debug(
            "detect client socket close " +
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

    return new Promise<URL>((resolve, reject) =>
      this._mitmProxy!.listen(mitmOptions, (err: Error) => {
        if (err) {
          reject(err);
        }
        const listenUrl = new URL(
          "http://localhost:" + this._mitmProxy!.httpPort
        );
        debug("listening on " + listenUrl.origin);
        resolve(listenUrl);
      })
    );
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
    const caCertPath = path.join(
      process.cwd(),
      ".http-mitm-proxy",
      "certs",
      "ca.pem"
    );
    return fs.readFileSync(caCertPath);
  }

  static async sendQuitCommand(
    configApiUrl: URL,
    keepPortsFile: boolean
  ): Promise<HttpResponse> {
    const res = await HttpClient.post(
      new URL("/quit", configApiUrl),
      { keepPortsFile: keepPortsFile },
      {
        timeout: 15000,
      }
    );

    if (res.status !== 200) {
      throw new Error("Unexpected response from NTLM proxy: " + res.status);
    }
    return res;
  }

  static async sendAliveRequest(configApiUrl: URL): Promise<HttpResponse> {
    const res = await HttpClient.get(new URL("/alive", configApiUrl), {
      timeout: 15000,
    });
    if (res.status !== 200) {
      throw new Error("Unexpected response from NTLM proxy: " + res.status);
    }
    return res;
  }

  static async sendNtlmConfig(
    configApiUrl: URL,
    hostConfig: NtlmConfig,
    timeout?: number
  ): Promise<HttpResponse> {
    const res = await HttpClient.post(
      new URL("/ntlm-config", configApiUrl),
      hostConfig,
      {
        timeout: timeout,
      }
    );
    return res;
  }

  static async sendNtlmSsoConfig(
    configApiUrl: URL,
    ssoConfig: NtlmSsoConfig,
    timeout?: number
  ): Promise<HttpResponse> {
    const res = await HttpClient.post(
      new URL("/ntlm-sso", configApiUrl),
      ssoConfig,
      {
        timeout: timeout,
      }
    );
    return res;
  }

  static async sendNtlmReset(configApiUrl: URL): Promise<HttpResponse> {
    const res = await HttpClient.post(new URL("/reset", configApiUrl), null, {
      timeout: 15000,
    });
    if (res.status !== 200) {
      throw new Error("Unexpected response status code on reset" + res.status);
    }
    return res;
  }

  static getHttpProxyAgent(proxyUrl: URL, keepAlive: boolean) {
    return new http.Agent({
      keepAlive: keepAlive,
      host: proxyUrl.hostname,
      port: URLExt.portOrDefault(proxyUrl),
    });
  }

  static async sendProxiedHttpRequest(
    proxyUrl: URL,
    remoteHostUrl: URL,
    method: string,
    path: string,
    body: any,
    agent?: http.Agent
  ) {
    const res = await HttpClient.request(
      new URL(path, remoteHostUrl),
      {
        method: method,
        agent: agent || this.getHttpProxyAgent(proxyUrl, false),
        timeout: 5000,
      },
      body
    );
    return res;
  }

  static getHttpsProxyAgent(
    proxyUrl: URL,
    keepAlive: boolean,
    caCert?: Buffer[]
  ) {
    return httpsTunnel({
      proxy: {
        host: proxyUrl.hostname,
        port: URLExt.portOrDefault(proxyUrl),
        secureProxy: proxyUrl.protocol === "https:",
        headers: {
          "User-Agent": "Node",
        },
      },
      ca: caCert,
      keepAlive: keepAlive,
    });
  }

  static async sendProxiedHttpsRequest(
    proxyUrl: URL,
    remoteHostUrl: URL,
    method: string,
    path: string,
    body: any,
    caCert?: Buffer[],
    agent?: TunnelAgent
  ) {
    const tunnelAgent =
      agent || this.getHttpsProxyAgent(proxyUrl, false, caCert);

    const res = await HttpClient.request(
      new URL(path, remoteHostUrl),
      {
        method: method,
        agent: tunnelAgent as unknown as http.Agent,
        timeout: 5000,
      },
      body
    );

    if (!agent) {
      // Clean up internally created agent
      tunnelAgent.destroy();
    }
    return res;
  }
}
