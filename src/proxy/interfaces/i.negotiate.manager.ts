import { IContext } from "http-mitm-proxy";
import { CompleteUrl } from "../../models/complete.url.model.js";
import { IConnectionContext } from "./i.connection.context.js";
import * as http from "http";

export interface INegotiateManager {
  handshake(
    ctx: IContext,
    ntlmHostUrl: CompleteUrl,
    context: IConnectionContext,
    callback: (error?: NodeJS.ErrnoException) => void
  ): void;
  acceptsNegotiateAuthentication(res: http.IncomingMessage): boolean;
}
