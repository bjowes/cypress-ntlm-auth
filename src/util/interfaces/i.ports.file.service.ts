import { PortsFile } from '../../models/ports.file.model';

export interface IPortsFileService {
  fullPath(): string;
  delete(): Promise<void>;
  save(ports: PortsFile): Promise<void>;
  exists(): boolean;
  parse(): PortsFile;
  recentlyModified(): boolean;
}
