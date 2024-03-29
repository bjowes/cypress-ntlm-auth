import { IContext } from "@bjowes/http-mitm-proxy";
import { IConnectionContext } from "./i.connection.context";
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
