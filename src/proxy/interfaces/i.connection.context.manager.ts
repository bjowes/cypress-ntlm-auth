import { Socket } from 'net';
import { CompleteUrl } from '../../models/complete.url.model';
import { IConnectionContext } from './i.connection.context';

export interface IConnectionContextManager {
  getConnectionContextFromClientSocket(clientSocket: Socket, isSSL: boolean, targetHost: CompleteUrl): IConnectionContext;
  getNonNtlmAgent(isSSL: boolean, targetHost: CompleteUrl): any;
  getAgent(isSSL: boolean, targetHost: CompleteUrl, useNtlm: boolean): any;
  clearAuthentication(ntlmHostUrl: CompleteUrl): void;
  removeAllConnectionContexts(event: string): void;
  removeAgent(event: string, clientAddress: string): void;
}
