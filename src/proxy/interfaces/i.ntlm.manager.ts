import { IContext } from 'http-mitm-proxy';
import { CompleteUrl } from '../../models/complete.url.model';
import { IConnectionContext } from './i.connection.context';
import http from 'http';

export interface INtlmManager {
  ntlmHandshake(ctx: IContext, ntlmHostUrl: CompleteUrl, context: IConnectionContext, callback: (error?: NodeJS.ErrnoException) => void): void;
  acceptsNtlmAuthentication(res: http.IncomingMessage): boolean;
  canHandleNtlmAuthentication(res: http.IncomingMessage): boolean;
}
