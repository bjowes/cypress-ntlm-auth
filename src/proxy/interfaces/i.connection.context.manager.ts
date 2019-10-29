import { Socket } from 'net';
import { CompleteUrl } from '../../models/complete.url.model';
import { IConnectionContext } from './i.connection.context';

export interface IConnectionContextManager {
  createConnectionContext(clientSocket: Socket, isSSL: boolean, targetHost: CompleteUrl, useSso: boolean): IConnectionContext;
  getConnectionContextFromClientSocket(clientSocket: Socket): IConnectionContext | undefined;
  getAgent(isSSL: boolean, targetHost: CompleteUrl): any;
  getUntrackedAgent(targetHost: CompleteUrl): any;
  clearAuthentication(ntlmHostUrl: CompleteUrl): void;
  removeAllConnectionContexts(event: string): void;
  removeAgent(event: string, clientAddress: string): void;
}
