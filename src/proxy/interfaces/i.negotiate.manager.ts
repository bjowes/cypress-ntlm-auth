import type { IContext } from "@bjowes/http-mitm-proxy";
import type { IConnectionContext } from "./i.connection.context.ts";
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
