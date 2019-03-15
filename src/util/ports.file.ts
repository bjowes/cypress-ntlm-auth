import { debug } from './debug';

import fse from 'fs-extra';
import path from 'path';
import  url from 'url';
import appDataPath from 'appdata-path';
import { PortsFile } from '../models/ports.file.model';

export class PortsFileHandler {
  private static readonly _portsFileFolder = appDataPath('cypress-ntlm-auth');
  private static readonly _portsFileWithPath = path.join(appDataPath('cypress-ntlm-auth'), 'cypress-ntlm-auth.port');

  static async delete() {
    await fse.unlink(this._portsFileWithPath);
  }

  static async save(ports: PortsFile) {
    await fse.mkdirp(this._portsFileFolder);
    await fse.writeJson(this._portsFileWithPath, ports);
    debug('wrote ' + this._portsFileWithPath);
  }

  static exists(): boolean {
    return fse.existsSync(this._portsFileWithPath);
  }

  static parse(): PortsFile {
    if (this.exists()) {
      let data = fse.readJsonSync(this._portsFileWithPath);
      return this.validatePortsFile(data);
    } else {
      throw new Error('cypress-ntlm-auth proxy does not seem to be running. '+
        'It must be started before cypress. Please see the docs.' + this._portsFileWithPath);
    }
  }

  private static validatePortsFile(data: Object): PortsFile {
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

