import { Router } from 'express';
import { EventEmitter } from 'events';

export interface IConfigController {
  readonly router: Router;
  configApiEvent: EventEmitter;
}
