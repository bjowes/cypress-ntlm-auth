import { IContext } from "@bjowes/http-mitm-proxy";
import net from "net";
import http from "http";

export interface INtlmProxyMitm {
  onError(ctx: IContext, error: NodeJS.ErrnoException, errorKind: string): void;
  onRequest(
    ctx: IContext,
    callback: (error?: NodeJS.ErrnoException) => void
  ): void;
  onResponse(
    ctx: IContext,
    callback: (error?: NodeJS.ErrnoException) => void
  ): void;
  onConnect(
    req: http.IncomingMessage,
    socket: net.Socket,
    head: any,
    callback: (error?: NodeJS.ErrnoException) => void
  ): void;
}
