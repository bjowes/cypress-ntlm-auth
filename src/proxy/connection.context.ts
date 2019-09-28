import { NtlmStateEnum } from '../models/ntlm.state.enum';
import { CompleteUrl } from '../models/complete.url.model';
import { injectable } from 'inversify';
import { IConnectionContext } from './interfaces/i.connection.context';

@injectable()
export class ConnectionContext implements IConnectionContext {
  private _agent: any;
  private _ntlmHost?: CompleteUrl;
  private _ntlmState: NtlmStateEnum = NtlmStateEnum.NotAuthenticated;
  private _requestBody = Buffer.alloc(0);
  private _useSso = false;

  get agent(): any {
    return this._agent;
  }
  set agent(agent: any) {
    this._agent = agent;
  }

  get useSso(): boolean {
    return this._useSso;
  }
  set useSso(useSso: boolean) {
    this._useSso = useSso;
  }

  isAuthenticated(ntlmHostUrl: CompleteUrl): boolean {
    let auth = (this._ntlmHost !== undefined &&
      this._ntlmHost.href === ntlmHostUrl.href &&
      this._ntlmState === NtlmStateEnum.Authenticated);
    return auth;
  }

  isNewOrAuthenticated(ntlmHostUrl: CompleteUrl): boolean {
    let auth = this._ntlmHost === undefined ||
      (this._ntlmHost !== undefined &&
       this._ntlmHost.href === ntlmHostUrl.href &&
       this._ntlmState === NtlmStateEnum.Authenticated);
    return auth;
  }

  getState(ntlmHostUrl: CompleteUrl): NtlmStateEnum {
    if (this._ntlmHost && ntlmHostUrl.href === this._ntlmHost.href) {
      return this._ntlmState;
    }
    return NtlmStateEnum.NotAuthenticated;
  }

  setState(ntlmHostUrl: CompleteUrl, authState: NtlmStateEnum) {
    this._ntlmHost = ntlmHostUrl;
    this._ntlmState = authState;
  }

  resetState(ntlmHostUrl: CompleteUrl) {
    if (this._ntlmHost !== undefined && this._ntlmHost.href === ntlmHostUrl.href) {
      this._ntlmState = NtlmStateEnum.NotAuthenticated;
    }
  }

  clearRequestBody() {
    this._requestBody = Buffer.alloc(0);
  }

  addToRequestBody(chunk: Buffer) {
    this._requestBody = Buffer.concat([this._requestBody, chunk]);
  }

  getRequestBody(): Buffer {
    return this._requestBody;
  }
}
