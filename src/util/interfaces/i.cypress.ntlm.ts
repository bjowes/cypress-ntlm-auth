import { PortsFile } from "../../models/ports.file.model";

export interface ICypressNtlm {
  checkProxyIsRunning(timeout: number, interval: number): Promise<PortsFile>;
}
