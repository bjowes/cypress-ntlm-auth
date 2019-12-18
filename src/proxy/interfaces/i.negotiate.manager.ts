import { IContext } from 'http-mitm-proxy';
import { CompleteUrl } from '../../models/complete.url.model';
import { IConnectionContext } from './i.connection.context';
import http from 'http';

export interface INegotiateManager {
  handshake(ctx: IContext, ntlmHostUrl: CompleteUrl, context: IConnectionContext, callback: (error?: NodeJS.ErrnoException) => void): void;
  acceptsNegotiateAuthentication(res: http.IncomingMessage): boolean;
}
