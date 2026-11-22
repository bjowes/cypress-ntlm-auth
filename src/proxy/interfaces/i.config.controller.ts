import { Router } from 'express';
import { EventEmitter } from 'events';

export default abstract class IConfigController {
  abstract readonly router: Router;
  abstract configApiEvent: EventEmitter;
}
