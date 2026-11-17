import type { IContext } from "@bjowes/http-mitm-proxy";
import type { IConnectionContext } from "./i.connection.context.ts";
import * as http from "http";

export interface INtlmManager {
  handshake(
    ctx: IContext,
    ntlmHostUrl: URL,
    context: IConnectionContext,
    useSso: boolean,
    callback: (error?: NodeJS.ErrnoException) => void
  ): void;
  acceptsNtlmAuthentication(res: http.IncomingMessage): boolean;
}
