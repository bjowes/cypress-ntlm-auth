import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import { EventEmitter } from "node:events";
import debugInit from "debug";

const debug = debugInit("cypress:plugin:ntlm-auth:tunnelagent");

type RequestOptions = http.RequestOptions | https.RequestOptions;

export interface TunnelAgentOptions {
  maxSockets?: number;
  keepAlive?: boolean;
  proxy: {
    host: string;
    port: number;
    secureProxy?: boolean;
    proxyAuth?: string;
    headers?: {};
  };
  ca?: string | Buffer | (string | Buffer)[] | undefined;
  rejectUnauthorized?: boolean;
}

type CombinedAgentOptions = TunnelAgentOptions & https.AgentOptions;

interface Request {
  request: http.ClientRequest;
  options: RequestOptions & TunnelAgentOptions;
}

export function httpTunnel(options: CombinedAgentOptions) {
  return new TunnelingAgent(options, options.proxy.secureProxy, false);
}

export function httpsTunnel(options: CombinedAgentOptions) {
  return new TunnelingAgent(options, options.proxy.secureProxy, true);
}

let agentCount = 0;

export class TunnelingAgent extends EventEmitter {
  request: typeof http.request | typeof https.request;
  options: CombinedAgentOptions;
  defaultPort: number;
  maxSockets: number;
  requests: Request[];
  sockets: net.Socket[];
  freeSockets: {
    [key: string]: net.Socket[];
  };
  keepAlive: boolean;
  proxyOptions: any;
  agentId: number;
  createSocket: (request: Request) => void;

  debugLog(message: string) {
    debug("[" + this.agentId + "]: " + message);
  }

  constructor(options: CombinedAgentOptions, proxyOverHttps: boolean = false, targetUsesHttps: boolean = false) {
    super();
    var self = this;
    this.options = options;
    this.proxyOptions = options.proxy || {};
    this.maxSockets = options.maxSockets || 1;
    this.keepAlive = options.keepAlive || false;
    this.requests = [];
    this.sockets = [];
    this.freeSockets = {};
    this.request = proxyOverHttps ? https.request : http.request;
    this.createSocket = targetUsesHttps ? this.createSecureSocket : this.createTcpSocket;
    this.defaultPort = targetUsesHttps ? 443 : 80;
    this.agentId = agentCount++;

    this.debugLog("created");

    self.on("free", function onFree(socket: net.Socket, request: Request) {
      for (var i = 0, len = self.requests.length; i < len; ++i) {
        var pending = self.requests[i];
        self.debugLog("attempt to match socket on free");
        if (pending.options.host === request.options.host && pending.options.port === request.options.port) {
          self.debugLog("match ok");
          // Detect the request to connect same origin server,
          // reuse the connection.
          self.requests.splice(i, 1);
          pending.request.reusedSocket = true;
          pending.request.onSocket(socket);
          //pending.request.end();
          return;
        }
      }
      if (!self.keepAlive) {
        socket.destroy();
        self.removeSocket(socket);
        self.debugLog("non keep-alive, socket self destruct");
      } else {
        // save the socket for reuse later
        self.removeSocket(socket);
        socket.removeAllListeners();
        socket.unref();
        const socketKey = request.options.host + ":" + request.options.port;
        if (!!self.freeSockets[socketKey]) {
          self.freeSockets[socketKey].push(socket);
        } else {
          self.freeSockets[socketKey] = [socket];
        }
        socket.once("close", (hadError) => {
          self.debugLog("Remove socket on close");
          const socketIndex = self.freeSockets[socketKey].indexOf(socket);
          if (socketIndex !== -1) {
            self.freeSockets[socketKey].splice(socketIndex, 1);
          }
        });
      }
    });
  }

  //util.inherits(TunnelingAgent, events.EventEmitter);

  addRequest(req: http.ClientRequest, _opts: RequestOptions) {
    this.debugLog("addRequest");
    var self = this;
    let request: Request = { request: req, options: { ..._opts, ...self.options } };

    if (self.sockets.length >= this.maxSockets) {
      // We are over limit so we'll add it to the queue.
      self.requests.push(request);
      return;
    }

    if (self.keepAlive) {
      const socketKey = request.options.host + ":" + request.options.port;
      this.debugLog("addRequest: match " + socketKey);
      var socket = !!self.freeSockets[socketKey] ? self.freeSockets[socketKey].pop() : undefined;
      if (socket) {
        socket.removeAllListeners();
        socket.ref();
        this.sockets.push(socket);
        req.reusedSocket = true;
        self.executeRequest(request, socket);
        return;
      }
    }

    // If we are under maxSockets create a new one.
    self.createSocket(request);
  }

  executeRequest(request: Request, socket: net.Socket) {
    this.debugLog("executeRequest");
    let self = this;
    socket.on("free", onFree);
    socket.on("close", onCloseOrRemove);
    socket.on("agentRemove", onCloseOrRemove);
    request.request.onSocket(socket);
    //request.request.end();

    function onFree() {
      self.emit("free", socket, request);
    }

    function onCloseOrRemove(err: Error) {
      self.removeSocket(socket);
      socket.removeListener("free", onFree);
      socket.removeListener("close", onCloseOrRemove);
      socket.removeListener("agentRemove", onCloseOrRemove);
    }
  }

  createSocketInternal(request: Request, cb: (socket: net.Socket) => void) {
    var self = this;

    /*
    const keepAliveAgent = new http.Agent({
      keepAlive: true,
      maxSockets: 1,
      maxFreeSockets: 1,
    });
    */

    var connectOptions = {
      ...self.proxyOptions,
      method: "CONNECT",
      path: request.options.host + ":" + request.options.port,
      //agent: keepAliveAgent,
      headers: {
        host: request.options.host + ":" + request.options.port,
      },
    };
    if (request.options.localAddress) {
      connectOptions.localAddress = request.options.localAddress;
    }
    if (connectOptions.proxyAuth) {
      connectOptions.headers = connectOptions.headers || {};
      connectOptions.headers["Proxy-Authorization"] =
        "Basic " + Buffer.from(connectOptions.proxyAuth).toString("base64");
    }

    //debug("making CONNECT request");
    var connectReq = self.request(connectOptions);
    //connectReq.useChunkedEncodingByDefault = false; // for v0.6
    //connectReq.once("response", onResponse); // for v0.6
    //connectReq.once("upgrade", onUpgrade); // for v0.6
    connectReq.once("connect", onConnect); // for v0.7 or later
    connectReq.once("error", onError);
    connectReq.end();
    /*
    function onResponse(res: http.IncomingMessage) {
      // Very hacky. This is necessary to avoid http-parser leaks.
      // TODO bjowes
      //res.upgrade = true;
    }

    function onUpgrade(res: http.IncomingMessage, socket: net.Socket, head: any) {
      // Hacky.
      process.nextTick(function () {
        onConnect(res, socket, head);
      });
    }
*/
    function onConnect(res: http.IncomingMessage, socket: net.Socket, head: any) {
      connectReq.removeAllListeners();
      socket.removeAllListeners();

      if (res.statusCode !== 200) {
        self.debugLog("tunneling socket could not be established, statusCode=" + res.statusCode);
        socket.destroy();
        request.request.destroy(
          new Error("tunneling socket could not be established, " + "statusCode=" + res.statusCode)
        );
        self.processPending();
        return;
      }
      if (head.length > 0) {
        self.debugLog("got illegal response body from proxy");
        socket.destroy();
        request.request.destroy(new Error("got illegal response body from proxy"));
        self.processPending();
        return;
      }
      self.debugLog("tunneling connection established");
      self.sockets.push(socket);
      return cb(socket);
    }

    function onError(cause: Error) {
      connectReq.removeAllListeners();

      self.debugLog("tunneling socket could not be established, cause=" + cause.message + "\n" + cause.stack);
      request.request.destroy(new Error("tunneling socket could not be established, " + "cause=" + cause.message));
      self.processPending();
    }
  }

  removeSocket(socket: net.Socket) {
    var pos = this.sockets.indexOf(socket);
    if (pos === -1) {
      return;
    }
    this.sockets.splice(pos, 1);
    this.processPending();
  }

  processPending() {
    var pending = this.requests.shift();
    if (pending) {
      // If we have pending requests and a socket gets closed a new one
      // needs to be created to take over in the pool for the one that closed.
      this.createSocket(pending);
    }
  }

  createTcpSocket(request: Request) {
    var self = this;
    self.createSocketInternal(request, (socket: net.Socket) => self.executeRequest(request, socket));
  }

  createSecureSocket(request: Request) {
    var self = this;
    self.createSocketInternal(request, function (socket: net.Socket) {
      let hostHeader = request.request.getHeader("host") as string;
      let tlsOptions: tls.ConnectionOptions = {
        ...omit(self.options, "host", "path", "port"),
        socket: socket,
      };
      let servername = "";
      if (hostHeader) {
        servername = new URL("https://" + hostHeader).hostname;
      } else if (request.options.host) {
        servername = request.options.host;
      }
      if (servername) {
        tlsOptions.servername = servername;
      }

      var secureSocket = tls.connect(0, tlsOptions);
      self.sockets[self.sockets.indexOf(socket)] = secureSocket;
      self.executeRequest(request, secureSocket);
    });
  }

  destroy() {
    let self = this;
    self.debugLog("destroying agent");
    this.sockets.forEach((socket) => {
      socket.destroy();
      self.debugLog("s destroy");
    });
    for (const property in this.freeSockets) {
      if (this.freeSockets.hasOwnProperty(property)) {
        const sockets = this.freeSockets[property];
        sockets.forEach((socket) => {
          socket.destroy();
          self.debugLog("f destroy");
        });
      }
    }
  }
}

function omit<T extends object, K extends [...(keyof T)[]]>(
  obj: T,
  ...keys: K
): {
  [K2 in Exclude<keyof T, K[number]>]: T[K2];
} {
  const ret = {} as {
    [K in keyof typeof obj]: typeof obj[K];
  };
  let key: keyof typeof obj;
  for (key in obj) {
    if (!keys.includes(key)) {
      ret[key] = obj[key];
    }
  }
  return ret;
}
