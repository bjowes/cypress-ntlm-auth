import http from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import getPort from 'get-port';

import { ConfigController } from './config.controller';
import { debug } from '../util/debug';
import { injectable } from 'inversify';

@injectable()
export class ConfigServer {
  private readonly _configApp: express.Application = express();
  private _configAppListener?: http.Server = undefined;
  private _configApiUrl?: string = undefined;
  private initDone: boolean = false;

  constructor(private _configController: ConfigController) {}

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
    this._configApp.use(bodyParser.json());
    this._configApp.use('/', this._configController.router);
    this.initDone = true;
  }

  async start(port?: number): Promise<string> {
    this.init();
    if (!port) {
      port = await getPort();
    }

    try {
      this._configAppListener = await this._configApp.listen(port);
      debug('NTLM auth config API listening on port:', port);
      this._configApiUrl = 'http://127.0.0.1:' + port
      return this._configApiUrl;
    } catch (err) {
      debug('Cannot start NTLM auth config API');
      throw err;
    }
  }

  async stop() {
    debug('Shutting down config API');
    if (this._configAppListener) {
      try {
        await this._configAppListener.close();
        this._configAppListener = undefined;
        this._configApiUrl = undefined;
        debug('NTLM auth config API stopped');
      } catch (err) {
        debug('Cannot stop NTLM auth config API');
        throw err;
      }
    }
  }
};
