import { Router, Request, Response } from "express";
import { ConfigValidator } from "../util/config.validator";
import { NtlmConfig } from "../models/ntlm.config.model";
import { injectable, inject } from "inversify";
import { EventEmitter } from "events";
import { IConfigController } from "./interfaces/i.config.controller";
import { IConfigStore } from "./interfaces/i.config.store";
import { TYPES } from "./dependency.injection.types";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { SsoConfigValidator } from "../util/sso.config.validator";
import { NtlmSsoConfig } from "../models/ntlm.sso.config.model";
import { IPortsConfigStore } from "./interfaces/i.ports.config.store";
import { PortsConfig } from "../models/ports.config.model";
import { osSupported } from "win-sso";

/**
 * Config controller
 */
@injectable()
export class ConfigController implements IConfigController {
  readonly router: Router = Router();
  public configApiEvent = new EventEmitter();
  private _configStore: IConfigStore;
  private _portsConfigStore: IPortsConfigStore;
  private _debug: IDebugLogger;

  /**
   * Constructor
   * @param configStore Config store
   * @param portsConfigStore Ports config store
   * @param debug Debug logger
   */
  constructor(
    @inject(TYPES.IConfigStore) configStore: IConfigStore,
    @inject(TYPES.IPortsConfigStore) portsConfigStore: IPortsConfigStore,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger
  ) {
    this._configStore = configStore;
    this._portsConfigStore = portsConfigStore;
    this._debug = debug;
    this.router.post("/ntlm-config", (req: Request, res: Response) => this.ntlmConfig(req, res));
    this.router.post("/ntlm-sso", (req: Request, res: Response) => this.ntlmSso(req, res));
    this.router.post("/reset", (req: Request, res: Response) => this.reset(req, res));
    this.router.get("/alive", (req: Request, res: Response) => this.alive(req, res));
    this.router.post("/quit", (req: Request, res: Response) => this.quit(req, res));
  }

  private ntlmConfig(req: Request, res: Response) {
    const validateResult = ConfigValidator.validate(req.body);
    if (!validateResult.ok) {
      res.status(400).send("Config parse error. " + validateResult.message);
    } else {
      this._debug.log("Received valid NTLM config update");
      const config = req.body as NtlmConfig;
      this._debug.log("Added new hosts", config.ntlmHosts);
      this._configStore.updateConfig(config);
      res.sendStatus(200);
    }
  }

  private ntlmSso(req: Request, res: Response) {
    const validateResult = SsoConfigValidator.validate(req.body);
    if (!validateResult.ok) {
      res.status(400).send("SSO config parse error. " + validateResult.message);
      return;
    }
    if (!osSupported()) {
      res.status(400).send("SSO is not supported on this platform. Only Windows OSs are supported.");
      return;
    }
    this._debug.log("Received valid NTLM SSO config");
    const config = req.body as NtlmSsoConfig;
    this._configStore.setSsoConfig(config);
    res.sendStatus(200);
  }

  private reset(req: Request, res: Response) {
    this._debug.log("Received reset");
    this.configApiEvent.emit("reset");
    res.sendStatus(200);
  }

  private alive(req: Request, res: Response) {
    this._debug.log("Received alive");
    if (this._portsConfigStore.ntlmProxyUrl && this._portsConfigStore.configApiUrl) {
      const ports: PortsConfig = {
        configApiUrl: this._portsConfigStore.configApiUrl.origin,
        ntlmProxyUrl: this._portsConfigStore.ntlmProxyUrl.origin,
      };
      res.status(200).send(ports);
    } else {
      res.sendStatus(503);
    }
  }

  private quit(req: Request, res: Response) {
    this._debug.log("Received quit");
    res.sendStatus(200);
    this.configApiEvent.emit("quit");
  }
}
