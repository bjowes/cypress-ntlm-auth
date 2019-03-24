import httpMitmProxy from 'http-mitm-proxy';
import getPort from 'get-port';

import { debug } from '../util/debug';
import { NtlmProxyMitm } from './ntlm.proxy.mitm';
import { injectable } from 'inversify';

@injectable()
export class NtlmProxyServer {
  private readonly _ntlmProxy: httpMitmProxy.IProxy;
  private readonly _ntlmProxyMitm: NtlmProxyMitm;
  private initDone: boolean = false;
  private _ntlmProxyListening: boolean = false;
  private _ntlmProxyUrl?: string;

  constructor(ntlmProxyMitm: NtlmProxyMitm) {
    this._ntlmProxyMitm = ntlmProxyMitm;
    this._ntlmProxy = httpMitmProxy();
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
    this._ntlmProxy.use(this._ntlmProxyMitm);
    this.initDone = true;
  }

  async start(port?: number): Promise<string> {
    this.init();
    if (!port) {
      port = await getPort();
    }

    try {
      await new Promise((resolve, reject) => this._ntlmProxy.listen(
      { host: 'localhost', port: port, keepAlive: true, forceSNI: false },
      (err: Error) => {
        if (err) {
          reject(err);
        }
        resolve();
      }));
      debug('NTLM auth proxy listening on port:', port);
      this._ntlmProxyListening = true;
      this._ntlmProxyUrl = 'http://127.0.0.1:' + port;
      return this._ntlmProxyUrl;
    } catch (err) {
      debug('Cannot start NTLM auth proxy');
      throw err;
    }
  }

  stop() {
    debug('Shutting down NTLM proxy');
    if (this._ntlmProxyListening) {
      this._ntlmProxy.close();
      this._ntlmProxyListening = false;
      this._ntlmProxyUrl = undefined;
    }
  }
};
