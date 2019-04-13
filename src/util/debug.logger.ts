import { debug as debugInit } from 'debug';
import { injectable } from 'inversify';
import { IDebugLogger } from './interfaces/i.debug.logger';

const debug = debugInit('cypress:plugin:ntlm-auth');

@injectable()
export class DebugLogger implements IDebugLogger {
  log(formatter: any, ...args: any[]) {
    debug(formatter, ...args);
  }
}
