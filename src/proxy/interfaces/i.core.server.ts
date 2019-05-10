import { PortsFile } from '../../models/ports.file.model';

export interface ICoreServer {
  start(allowMultipleInstances: boolean, httpProxy?: string, httpsProxy?: string, noProxy?: string): Promise<PortsFile>;
  stop(keepPortsFile: boolean): Promise<void>;
}
