import { IContext } from 'http-mitm-proxy';
import { CompleteUrl } from '../../models/complete.url.model';
import { IConnectionContext } from './i.connection.context';

export interface INtlmManager {
  ntlmHandshake(ctx: IContext, ntlmHostUrl: CompleteUrl, context: IConnectionContext, callback: (error?: NodeJS.ErrnoException) => void): void;
  ntlmHandshakeResponse(ctx: IContext, ntlmHostUrl: CompleteUrl, context: IConnectionContext, callback: (error?: NodeJS.ErrnoException) => void): void;
}
