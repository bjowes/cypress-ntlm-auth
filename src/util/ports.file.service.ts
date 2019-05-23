import fse from 'fs-extra';
import path from 'path';
import util from 'util';
import * as url from 'url';
import appDataPath from 'appdata-path';
import { PortsFile } from '../models/ports.file.model';
import { injectable } from 'inversify';
import { IPortsFileService } from './interfaces/i.ports.file.service';

@injectable()
export class PortsFileService implements IPortsFileService {
  private readonly _portsFileFolder = appDataPath('cypress-ntlm-auth');
  private readonly _portsFileWithPath = path.join(appDataPath('cypress-ntlm-auth'), 'cypress-ntlm-auth.port');

  fullPath(): string {
    return this._portsFileWithPath;
  }

  async delete() {
    await fse.unlink(this._portsFileWithPath);
  }

  async save(ports: PortsFile) {
    await fse.mkdirp(this._portsFileFolder);
    await fse.writeJson(this._portsFileWithPath, ports);
  }

  exists(): boolean {
    return fse.existsSync(this._portsFileWithPath);
  }

  parse(): PortsFile {
    if (this.exists()) {
      let data = fse.readJsonSync(this._portsFileWithPath);
      return this.validatePortsFile(data);
    } else {
      throw new Error('cypress-ntlm-auth proxy does not seem to be running. '+
        'It must be started before cypress. Please see the docs.' + this._portsFileWithPath);
    }
  }

  // Was the ports file modified within the last 10 seconds?
  recentlyModified(): boolean {
    if (this.exists()) {
      let stats = fse.statSync(this._portsFileWithPath);
      let mtime = new Date(util.inspect(stats.mtime));
      let now = new Date();
      if ((now.getTime() - mtime.getTime()) < 10 * 1000) {
        return true;
      }
    }
    return false;
  }

  private validatePortsFile(data: Object): PortsFile {
    let ports = data as PortsFile;

    if (!ports || !ports.configApiUrl || !ports.ntlmProxyUrl) {
      throw new Error('Cannot parse ports file ' + this._portsFileWithPath);
    }
    ports = <PortsFile>data;
    let urlTest = url.parse(ports.configApiUrl);
    if (!urlTest.protocol || !urlTest.hostname ||
        !urlTest.port || !urlTest.slashes) {
      throw new Error('Invalid configApiUrl in ports file ' + this._portsFileWithPath);
    }
    urlTest = url.parse(ports.ntlmProxyUrl);
    if (!urlTest.protocol || !urlTest.hostname ||
        !urlTest.port || !urlTest.slashes) {
      throw new Error('Invalid ntlmProxyUrl in ports file ' + this._portsFileWithPath);
    }
    return ports;
  }
}

