import getPort from 'get-port';

import { injectable, inject } from 'inversify';
import { INtlmProxyServer } from './interfaces/i.ntlm.proxy.server';
import { INtlmProxyMitm } from './interfaces/i.ntlm.proxy.mitm';
import { TYPES } from './dependency.injection.types';
import { IHttpMitmProxyFacade } from './interfaces/i.http.mitm.proxy.facade';
import { IDebugLogger } from '../util/interfaces/i.debug.logger';

@injectable()
export class NtlmProxyServer implements INtlmProxyServer {
  private initDone: boolean = false;
  private _ntlmProxyUrl?: string;
  private _ntlmProxyMitm: INtlmProxyMitm;
  private _httpMitmProxy: IHttpMitmProxyFacade;
  private _debug: IDebugLogger;

  constructor(
    @inject(TYPES.INtlmProxyMitm) ntlmProxyMitm: INtlmProxyMitm,
    @inject(TYPES.IHttpMitmProxyFacade) httpMitmProxyFacade: IHttpMitmProxyFacade,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._ntlmProxyMitm = ntlmProxyMitm;
    this._httpMitmProxy = httpMitmProxyFacade;
    this._debug = debug;
  }

  get ntlmProxyUrl(): string {
    if (this._ntlmProxyUrl) {
      return this._ntlmProxyUrl;
    }
    throw new Error('Cannot get ntlmProxyUrl, NtlmProxyServer not started!');
  }

  init() {
    if (this.initDone) {
      return;
    }
    this._httpMitmProxy.use(this._ntlmProxyMitm);
    this.initDone = true;
  }

  async start(port?: number): Promise<string> {
    this.init();

    try {
      if (!port) {
        port = await getPort();
      }
      this._ntlmProxyUrl = await this._httpMitmProxy.listen(port);
      this._debug.log('NTLM auth proxy listening on port:', port);
      this._ntlmProxyUrl = 'http://127.0.0.1:' + port;
      this._ntlmProxyMitm.NtlmProxyPort = String(port);
      return this._ntlmProxyUrl;
    } catch (err) {
      this._debug.log('Cannot start NTLM auth proxy');
      throw err;
    }
  }

  stop() {
    this._debug.log('Shutting down NTLM proxy');
    this._httpMitmProxy.close();
    this._ntlmProxyUrl = undefined;
    this._ntlmProxyMitm.NtlmProxyPort = '';
  }
};
