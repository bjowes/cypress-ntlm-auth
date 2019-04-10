import { NtlmStateEnum } from '../../models/ntlm.state.enum';
import { CompleteUrl } from '../../models/complete.url.model';

export interface IConnectionContext {
  agent: any;

  isAuthenticated(ntlmHostUrl: CompleteUrl): boolean;
  getState(ntlmHostUrl: CompleteUrl): NtlmStateEnum;
  setState(ntlmHostUrl: CompleteUrl, authState: NtlmStateEnum): void;
  resetState(ntlmHostUrl: CompleteUrl): void;
}
