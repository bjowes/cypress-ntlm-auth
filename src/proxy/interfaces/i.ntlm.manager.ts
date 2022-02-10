import { IContext } from "http-mitm-proxy";
import { IConnectionContext } from "./i.connection.context.js";
import * as http from "http";
import { URLExt } from "../../util/url.ext.js";

export interface INtlmManager {
  handshake(
    ctx: IContext,
    ntlmHostUrl: URLExt,
    context: IConnectionContext,
    useSso: boolean,
    callback: (error?: NodeJS.ErrnoException) => void
  ): void;
  acceptsNtlmAuthentication(res: http.IncomingMessage): boolean;
}
