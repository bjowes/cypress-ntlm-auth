import { Router, Request, Response } from 'express';
import { ConfigValidator } from '../util/config.validator';
import { ConfigStore } from './config.store';
import { debug } from '../util/debug';
import { toCompleteUrl } from '../util/url.converter';
import { NtlmConfig } from '../models/ntlm.config.model';
import { injectable } from 'inversify';
import { EventEmitter } from 'events';

@injectable()
export class ConfigController {
  readonly router: Router = Router();
  public configApiEvent = new EventEmitter();

  constructor(private _configStore: ConfigStore) {
    this.router.post('/ntlm-config', (req: Request, res: Response) => this.ntlmConfig(req, res));
    this.router.post('/reset', (req: Request, res: Response) => this.reset(req, res));
    this.router.get('/alive', (req: Request, res: Response) => this.alive(req, res));
    this.router.post('/quit', (req: Request, res: Response) => this.quit(req, res));
  }

  private ntlmConfig(req: Request, res: Response) {
    let validateResult = ConfigValidator.validate(req.body);
      if (!validateResult.ok) {
        res.status(400).send('Config parse error. ' + validateResult.message);
      } else {
        debug('Received valid config update');
        let config = req.body as NtlmConfig;
        let ntlmHostUrl = toCompleteUrl(config.ntlmHost, false);
        if (this._configStore.exists(ntlmHostUrl)) {
          // Trigger removal of existing authentication cache
          this.configApiEvent.emit('configUpdate', ntlmHostUrl);
          debug('Updating host', ntlmHostUrl.href);
        } else {
          debug('Added new host' , ntlmHostUrl.href);
        }
        this._configStore.updateConfig(config);
        res.sendStatus(200);
      }
  }

  private reset(req: Request, res: Response) {
    debug('Received reset');
    this.configApiEvent.emit('reset');
    res.sendStatus(200);
  }

  private alive(req: Request, res: Response) {
    debug('Received alive');
    res.sendStatus(200);
  }

  private quit(req: Request, res: Response) {
    debug('Received quit');
    res.status(200).send('Over and out!');
    let keepPortsFile = req.body && req.body.keepPortsFile;
    this.configApiEvent.emit('quit', keepPortsFile);
  }
};
