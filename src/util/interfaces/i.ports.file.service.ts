import { PortsFile } from '../../models/ports.file.model';

export interface IPortsFileService {
  delete(): Promise<void>;
  save(ports: PortsFile): Promise<void>;
  exists(): boolean;
  parse(): PortsFile;
}
