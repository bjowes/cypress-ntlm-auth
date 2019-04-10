import getPort from 'get-port';

import { IConfigController } from './interfaces/i.config.controller';
import { debug } from '../util/debug';
import { injectable, inject } from 'inversify';
import { IConfigServer } from './interfaces/i.config.server';
import { IExpressServer } from './interfaces/i.express.server';
import { TYPES } from './dependency.injection.types';

@injectable()
export class ConfigServer implements IConfigServer {
  private _configApiUrl?: string = undefined;
  private initDone: boolean = false;
  private _expressServer: IExpressServer;
  private _configController: IConfigController;

  constructor(
    @inject(TYPES.IExpressServer) expressServer: IExpressServer,
    @inject(TYPES.IConfigController) configController: IConfigController) {
      this._expressServer = expressServer;
      this._configController = configController;
    }

  get configApiUrl(): string {
    if (this._configApiUrl) {
      return this._configApiUrl;
    }
    throw new Error('Cannot get configApiUrl, ConfigServer not started!');
  }

  init() {
    if (this.initDone) {
      return;
    }
    this._expressServer.use('/', this._configController.router);
    this.initDone = true;
  }

  async start(port?: number): Promise<string> {
    this.init();

    try {
      if (!port) {
        port = await getPort();
      }
      this._configApiUrl = await this._expressServer.listen(port);
      debug('NTLM auth config API listening on port:', port);
      return this._configApiUrl;
    } catch (err) {
      debug('Cannot start NTLM auth config API');
      throw err;
    }
  }

  async stop() {
    debug('Shutting down config API');
    try {
      await this._expressServer.close();
      this._configApiUrl = undefined;
      debug('NTLM auth config API stopped');
    } catch (err) {
      debug('Cannot stop NTLM auth config API');
      throw err;
    }
  }
};
