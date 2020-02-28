import { IContext } from "http-mitm-proxy";
import { CompleteUrl } from "../../models/complete.url.model";
import { IConnectionContext } from "./i.connection.context";
import http from "http";

export interface INtlmManager {
  handshake(
    ctx: IContext,
    ntlmHostUrl: CompleteUrl,
    context: IConnectionContext,
    useSso: boolean,
    callback: (error?: NodeJS.ErrnoException) => void
  ): void;
  acceptsNtlmAuthentication(res: http.IncomingMessage): boolean;
}
