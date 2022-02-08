// Patch for passing TLS options with the https-proxy-agent
// https://github.com/TooTallNate/node-https-proxy-agent/issues/89

import { ClientRequest, RequestOptions } from "agent-base";
import HttpsProxyAgentPackage from "https-proxy-agent";
export { HttpsProxyAgentOptions } from "https-proxy-agent";
import { Socket } from "net";

export class PatchedHttpsProxyAgent extends HttpsProxyAgentPackage.HttpsProxyAgent {
  private ca: any;
  private keepAlive: boolean;

  constructor(opts: HttpsProxyAgentPackage.HttpsProxyAgentOptions, keepAlive = true) {
    super(opts);
    this.ca = opts.ca;
    this.keepAlive = keepAlive;
  }

  async callback(req: ClientRequest, opts: RequestOptions): Promise<Socket> {
    let socket = await super.callback(req, Object.assign(opts, { ca: this.ca }));
    if (this.keepAlive) {
      socket.setKeepAlive(true, 1000);
      req.shouldKeepAlive = true;
      console.error("set keepalive");
    }
    return socket;
  }
}
