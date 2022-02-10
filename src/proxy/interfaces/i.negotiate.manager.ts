import { IContext } from "http-mitm-proxy";
import { IConnectionContext } from "./i.connection.context.js";
import * as http from "http";
import { URLExt } from "../../util/url.ext.js";

export interface INegotiateManager {
  handshake(
    ctx: IContext,
    ntlmHostUrl: URLExt,
    context: IConnectionContext,
    callback: (error?: NodeJS.ErrnoException) => void
  ): void;
  acceptsNegotiateAuthentication(res: http.IncomingMessage): boolean;
}
