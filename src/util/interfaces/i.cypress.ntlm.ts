import { PortsFile } from "../../models/ports.file.model";

export interface ICypressNtlm {
  checkCypressIsInstalled(): boolean;
  checkProxyIsRunning(timeout: number, interval: number): Promise<PortsFile>;
}
