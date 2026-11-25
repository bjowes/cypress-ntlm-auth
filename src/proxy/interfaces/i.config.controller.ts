import { Router } from 'express';
import { EventEmitter } from 'events';

export abstract class IConfigController {
  abstract readonly router: Router;
  abstract configApiEvent: EventEmitter;
}
