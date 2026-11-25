import type { IContext } from "@bjowes/http-mitm-proxy";
import net from "net";
import http from "http";

export abstract class INtlmProxyMitm {
  abstract onError(ctx: IContext, error: NodeJS.ErrnoException, errorKind: string): void;
  abstract onRequest(
    ctx: IContext,
    callback: (error?: NodeJS.ErrnoException) => void
  ): void;
  abstract onResponse(
    ctx: IContext,
    callback: (error?: NodeJS.ErrnoException) => void
  ): void;
  abstract onConnect(
    req: http.IncomingMessage,
    socket: net.Socket,
    head: Uint8Array | string,
    callback: (error?: NodeJS.ErrnoException) => void
  ): void;
}
