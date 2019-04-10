import { debug } from './debug';

import fse from 'fs-extra';
import path from 'path';
import * as url from 'url';
import appDataPath from 'appdata-path';
import { PortsFile } from '../models/ports.file.model';
import { injectable } from 'inversify';
import { IPortsFileService } from './interfaces/i.ports.file.service';

@injectable()
export class PortsFileService implements IPortsFileService {
  private readonly _portsFileFolder = appDataPath('cypress-ntlm-auth');
  private readonly _portsFileWithPath = path.join(appDataPath('cypress-ntlm-auth'), 'cypress-ntlm-auth.port');

 async delete() {
    await fse.unlink(this._portsFileWithPath);
  }

 async save(ports: PortsFile) {
    await fse.mkdirp(this._portsFileFolder);
    await fse.writeJson(this._portsFileWithPath, ports);
    debug('wrote ' + this._portsFileWithPath);
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

