import { Socket } from "net";
import { URLExt } from "../../util/url.ext.js";
import { IConnectionContext } from "./i.connection.context.js";

export interface IConnectionContextManager {
  createConnectionContext(clientSocket: Socket, isSSL: boolean, targetHost: URLExt): IConnectionContext;
  getConnectionContextFromClientSocket(clientSocket: Socket): IConnectionContext | undefined;
  getUntrackedAgent(targetHost: URLExt): any;
  removeAllConnectionContexts(event: string): void;
  removeAgent(event: string, clientAddress: string): void;
  addTunnel(client: Socket, target: Socket): void;
  removeTunnel(client: Socket): void;
  removeAndCloseAllTunnels(event: string): void;
}
