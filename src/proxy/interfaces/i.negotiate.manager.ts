import { IContext } from "http-mitm-proxy";
import { IConnectionContext } from "./i.connection.context";
import * as http from "http";

export interface INegotiateManager {
  handshake(
    ctx: IContext,
    ntlmHostUrl: URL,
    context: IConnectionContext,
    callback: (error?: NodeJS.ErrnoException) => void
  ): void;
  acceptsNegotiateAuthentication(res: http.IncomingMessage): boolean;
}
