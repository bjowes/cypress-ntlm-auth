import net from "net";
import tls from "tls";
import http from "http";
import https from "https";
import { EventEmitter } from "events";
import debugInit from "debug";

const debug = debugInit("cypress:plugin:ntlm-auth:tunnelagent");

type RequestOptions = http.RequestOptions | https.RequestOptions;

export interface TunnelAgentProxyOptions {
  host: string;
  port: number;
  secureProxy?: boolean;
  proxyAuth?: string;
  headers?: object;
  ALPNProtocols?: string[];
}

export interface TunnelAgentOptions {
  maxSockets?: number;
  keepAlive?: boolean;
  proxy: TunnelAgentProxyOptions;
  ca?: string | Buffer | (string | Buffer)[] | undefined;
  rejectUnauthorized?: boolean;
}

type CombinedAgentOptions = TunnelAgentOptions & https.AgentOptions;

interface Request {
  clientReq: http.ClientRequest;
  options: RequestOptions & TunnelAgentOptions;
  socketKey: string;
}

/**
 * Create an agent for tunnelling HTTP requests through an upstream proxy
 * @param options Agent options
 * @returns the tunnel agent
 */
export function httpTunnel(options: CombinedAgentOptions) {
  return new TunnelAgent(options, options.proxy.secureProxy, false);
}

/**
 * Create an agent for tunnelling HTTPS requests through an upstream proxy
 * @param options Agent options
 * @returns the tunnel agent
 */
export function httpsTunnel(options: CombinedAgentOptions) {
  return new TunnelAgent(options, options.proxy.secureProxy, true);
}

let agentCount = 0;

class SocketStore {
  private sockets: {
    [key: string]: net.Socket[];
  } = {};

  insert(key: string, socket: net.Socket) {
    if (this.sockets[key]) {
      this.sockets[key].push(socket);
    } else {
      this.sockets[key] = [socket];
    }
  }

  get(key: string): net.Socket | undefined {
    if (this.sockets[key] && this.sockets[key].length > 0) {
      return this.sockets[key].pop();
    }
    return undefined;
  }

  length(key: string) {
    if (this.sockets[key]) {
      return this.sockets[key].length;
    }
    return 0;
  }

  count() {
    let sum = 0;
    for (const property in this.sockets) {
      if (Object.prototype.hasOwnProperty.call(this.sockets, property)) {
        sum += this.sockets[property].length;
      }
    }
    return sum;
  }

  remove(key: string, socket: net.Socket) {
    const socketIndex = this.sockets[key].indexOf(socket);
    if (socketIndex === -1) {
      throw new Error("SocketStore: Attempt to remove non-existing socket");
    }
    this.sockets[key].splice(socketIndex, 1);
  }

  replace(key: string, socket: net.Socket, newSocket: net.Socket) {
    this.sockets[key][this.sockets[key].indexOf(socket)] = newSocket;
  }

  destroy() {
    for (const property in this.sockets) {
      if (Object.prototype.hasOwnProperty.call(this.sockets, property)) {
        const sockets = this.sockets[property];
        sockets.forEach((socket) => {
          socket.destroy();
        });
      }
    }
  }
}

/**
 * Custom agent for tunneling traffic through an upstream proxy
 */
export class TunnelAgent extends EventEmitter {
  request: typeof http.request | typeof https.request;
  options: CombinedAgentOptions;
  defaultPort: number;
  maxSockets: number;
  requests: Request[];
  sockets: SocketStore;
  freeSockets: SocketStore;
  keepAlive: boolean;
  proxyOptions: TunnelAgentProxyOptions;
  destroyPending = false;
  agentId: number;
  createSocket: (request: Request) => void;

  private debugLog(message: string) {
    debug("[" + this.agentId + "]: " + message);
  }

  /**
   * Constuctor
   * @param options Agent options
   * @param proxyOverHttps Upstream proxy uses HTTPS
   * @param targetUsesHttps Target uses HTTPS
   */
  constructor(
    options: CombinedAgentOptions,
    proxyOverHttps: boolean = false,
    targetUsesHttps: boolean = false
  ) {
    super();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.options = options;
    this.proxyOptions = options.proxy || ({} as TunnelAgentProxyOptions);
    this.maxSockets = options.maxSockets || 1;
    this.keepAlive = options.keepAlive || false;
    this.requests = [];
    this.sockets = new SocketStore();
    this.freeSockets = new SocketStore();
    this.request = proxyOverHttps ? https.request : http.request;
    this.createSocket = targetUsesHttps
      ? this.createSecureSocket
      : this.createTcpSocket;
    this.defaultPort = targetUsesHttps ? 443 : 80;
    this.agentId = agentCount++;

    // attempt to negotiate http/1.1 for proxy servers that support http/2
    if (
      this.proxyOptions.secureProxy &&
      !("ALPNProtocols" in this.proxyOptions)
    ) {
      this.proxyOptions.ALPNProtocols = ["http 1.1"];
    }

    self.on("free", function onFree(socket: net.Socket, request: Request) {
      for (let i = 0, len = self.requests.length; i < len; ++i) {
        const pending = self.requests[i];
        if (pending.socketKey === request.socketKey) {
          self.debugLog("socket free, reusing for pending request");
          // Detect the request to connect same origin server, reuse the connection.
          self.requests.splice(i, 1);
          pending.clientReq.reusedSocket = true;
          pending.clientReq.onSocket(socket);
          return;
        }
      }

      self.sockets.remove(request.socketKey, socket);
      if (!self.keepAlive) {
        socket.destroy();
        self.debugLog("socket free, non keep-alive => destroy socket");
      } else {
        // save the socket for reuse later
        socket.removeAllListeners();
        socket.unref();
        self.freeSockets.insert(request.socketKey, socket);
        socket.once("close", () => {
          if (self.destroyPending) return;
          self.debugLog("remove socket on socket close");
          self.freeSockets.remove(request.socketKey, socket);
        });
      }
      self.processPending();
    });
  }

  /**
   * Counts all sockets active in requests and pending (keep-alive)
   * @returns The number of sockets, free and in use
   */
  socketCount() {
    return this.sockets.count() + this.freeSockets.count();
  }

  /**
   * Add a reuqest to queue for transmission
   * @param req Request object
   * @param _opts Request options
   */
  addRequest(req: http.ClientRequest, _opts: RequestOptions): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const request: Request = {
      clientReq: req,
      socketKey: `${_opts.host}:${_opts.port}`,
      options: { ..._opts, ...self.options },
    };

    if (self.sockets.length(request.socketKey) >= this.maxSockets) {
      // We are over limit for the host so we'll add it to the queue.
      self.requests.push(request);
      return;
    }

    if (self.keepAlive) {
      const socket = self.freeSockets.get(request.socketKey);
      if (socket) {
        this.debugLog("addRequest: reuse free socket for " + request.socketKey);
        socket.removeAllListeners();
        socket.ref();
        self.sockets.insert(request.socketKey, socket);
        req.reusedSocket = true;
        self.executeRequest(request, socket);
        return;
      }
    }

    // If we are under maxSockets create a new one.
    self.createSocket(request);
  }

  private executeRequest(request: Request, socket: net.Socket) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    socket.on("free", onFree);
    socket.on("close", onCloseOrRemove);
    socket.on("agentRemove", onCloseOrRemove);
    request.clientReq.onSocket(socket);

    function onFree() {
      self.debugLog("onFree");
      self.emit("free", socket, request);
    }

    function onCloseOrRemove(hadError: boolean): void {
      self.debugLog("onClose");
      if (self.destroyPending) return;
      socket.removeListener("free", onFree);
      socket.removeListener("close", onCloseOrRemove);
      socket.removeListener("agentRemove", onCloseOrRemove);
      if (self.keepAlive) {
        socket.emit("close", hadError); // Let the freeSocket event handler remove the socket
      }
      self.processPending();
    }
  }

  private escapeHost(hostname: string, port: string | number) {
    if (hostname.indexOf(":") === -1) {
      return `${hostname}:${port}`;
    }
    return `[${hostname}]:${port}`;
  }

  private createSocketInternal(
    request: Request,
    cb: (socket: net.Socket) => void
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const host = this.escapeHost(request.options.host!, request.options.port!);
    const connectOptions: http.RequestOptions = {
      ...self.proxyOptions,
      method: "CONNECT",
      path: host,
      headers: {
        host: host,
      } as http.OutgoingHttpHeaders,
    };
    if (request.options.localAddress) {
      connectOptions.localAddress = request.options.localAddress;
    }
    if (self.proxyOptions.proxyAuth) {
      (connectOptions.headers as http.OutgoingHttpHeaders)["Proxy-Authorization"] =
        "Basic " + Buffer.from(self.proxyOptions.proxyAuth).toString("base64");
    }

    const connectReq = self.request(connectOptions);
    connectReq.once("connect", onConnect);
    connectReq.once("error", onError);
    connectReq.end();

    function onConnect(
      res: http.IncomingMessage,
      socket: net.Socket,
      head: string
    ): void {
      connectReq.removeAllListeners();
      socket.removeAllListeners();

      if (res.statusCode !== 200) {
        self.debugLog(
          "tunneling socket could not be established, statusCode=" +
            res.statusCode
        );
        socket.destroy();
        request.clientReq.destroy(
          new Error(
            "tunneling socket could not be established, " +
              "statusCode=" +
              res.statusCode
          )
        );
        self.processPending();
        return;
      }
      if (head.length > 0) {
        self.debugLog("got illegal response body from proxy");
        socket.destroy();
        request.clientReq.destroy(
          new Error("got illegal response body from proxy")
        );
        self.processPending();
        return;
      }
      self.debugLog("tunneling connection established");
      self.sockets.insert(request.socketKey, socket);
      return cb(socket);
    }

    function onError(cause: Error): void {
      connectReq.removeAllListeners();
      self.debugLog(
        "tunneling socket could not be established, cause=" +
          cause.message +
          "\n" +
          cause.stack
      );
      request.clientReq.destroy(
        new Error(
          "tunneling socket could not be established, " +
            "cause=" +
            cause.message
        )
      );
      self.processPending();
    }
  }

  private processPending() {
    const pending = this.requests.shift();
    if (pending) {
      // If we have pending requests and a socket gets closed a new one
      // needs to be created to take over in the pool for the one that closed.
      this.createSocket(pending);
    }
  }

  private createTcpSocket(request: Request) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    self.createSocketInternal(request, (socket: net.Socket) =>
      self.executeRequest(request, socket)
    );
  }

  private createSecureSocket(request: Request) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    self.createSocketInternal(request, function (socket: net.Socket) {
      const hostHeader = request.clientReq.getHeader("host") as string;
      const tlsOptions: tls.ConnectionOptions = {
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

      const secureSocket = tls.connect(0, tlsOptions);
      self.sockets.replace(request.socketKey, socket, secureSocket);
      self.executeRequest(request, secureSocket);
    });
  }

  /**
   * Destroys the agent and the tunnel
   */
  destroy() {
    this.debugLog("destroying agent");
    this.destroyPending = true;
    this.sockets.destroy();
    this.freeSockets.destroy();
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
