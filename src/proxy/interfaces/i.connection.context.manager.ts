import { Socket } from "net";
import type IConnectionContext from "./i.connection.context.ts";
import http from "http";

export default abstract class IConnectionContextManager {
  abstract createConnectionContext(clientSocket: Socket, isSSL: boolean, targetHost: URL): IConnectionContext;
  abstract getConnectionContextFromClientSocket(clientSocket: Socket): IConnectionContext | undefined;
  abstract getUntrackedAgent(targetHost: URL): http.Agent;
  abstract removeAllConnectionContexts(event: string): void;
  abstract removeAgent(event: string, clientAddress: string): void;
  abstract addTunnel(client: Socket, target: Socket): void;
  abstract removeTunnel(client: Socket): void;
  abstract removeAndCloseAllTunnels(event: string): void;
  abstract resetHttpsValidation(): void;
}
