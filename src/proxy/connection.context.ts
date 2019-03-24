import { Socket } from 'net';
import { NtlmStateEnum } from '../models/ntlm.state.enum';
import { CompleteUrl } from '../models/complete.url.model';
import { injectable } from 'inversify';

interface ClientConnectionHash {
  [clientAddress: string]: Connection;
};

interface ConnectionAuthenticationHash {
  [ntlmHostUrl: string]: NtlmStateEnum
};

interface Connection {
  agent: any;
  ntlmHosts: ConnectionAuthenticationHash;
}

@injectable()
export class ConnectionContext {
  private _agent: any;
  private _ntlmHost?: CompleteUrl;
  private _ntlmState: NtlmStateEnum = NtlmStateEnum.NotAuthenticated;

  constructor(agent: any) {
    this._agent = agent;
  }

  get agent(): any {
    return this._agent;
  }

  isAuthenticated(ntlmHostUrl: CompleteUrl): boolean {
    let auth = (this._ntlmHost !== undefined &&
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

};
