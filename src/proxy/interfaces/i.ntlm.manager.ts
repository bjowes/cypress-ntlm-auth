import type { IContext } from "@bjowes/http-mitm-proxy";
import type { IConnectionContext } from "./i.connection.context.ts";
import * as http from "http";

export abstract class INtlmManager {
  abstract handshake(
    ctx: IContext,
    ntlmHostUrl: URL,
    context: IConnectionContext,
    useSso: boolean,
    callback: (error?: NodeJS.ErrnoException) => void
  ): void;
  abstract acceptsNtlmAuthentication(res: http.IncomingMessage): boolean;
}
