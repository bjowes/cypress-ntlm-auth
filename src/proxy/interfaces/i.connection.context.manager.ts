import { Socket } from "net";
import { IConnectionContext } from "./i.connection.context";

export interface IConnectionContextManager {
  createConnectionContext(clientSocket: Socket, isSSL: boolean, targetHost: URL): IConnectionContext;
  getConnectionContextFromClientSocket(clientSocket: Socket): IConnectionContext | undefined;
  getUntrackedAgent(targetHost: URL): any;
  removeAllConnectionContexts(event: string): void;
  removeAgent(event: string, clientAddress: string): void;
  addTunnel(client: Socket, target: Socket): void;
  removeTunnel(client: Socket): void;
  removeAndCloseAllTunnels(event: string): void;
  resetHttpsValidation(): void;
}
