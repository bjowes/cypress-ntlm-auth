import { DependencyInjection } from '../proxy/dependency.injection';
import { TYPES } from '../proxy/dependency.injection.types';
import { IDebugLogger } from '../util/interfaces/i.debug.logger';
import { IPortsFileService } from '../util/interfaces/i.ports.file.service';
import { PortsFile } from '../models/ports.file.model';

const container = new DependencyInjection();
let portsFileService = container.get<IPortsFileService>(TYPES.IPortsFileService);
let debug = container.get<IDebugLogger>(TYPES.IDebugLogger);

function validateEnvironment(ports: PortsFile) {
  if (!process.env.HTTP_PROXY) {
    debug.log('Error: HTTP_PROXY environment variable not set');
    throw new Error('HTTP_PROXY environment variable not set. Make sure cypress is started using the cypress-ntlm launcher.');
  }
  if (process.env.HTTP_PROXY !== ports.ntlmProxyUrl) {
    debug.log('Error: HTTP_PROXY environment variable (' + process.env.HTTP_PROXY + ') ' +
      'is not set to current NTLM proxy url (' + ports.ntlmProxyUrl + ').');
    throw new Error('HTTP_PROXY environment variable is not set to ' +
      'current NTLM proxy url (' + ports.ntlmProxyUrl +'). '+
      'Make sure cypress is started using the cypress-ntlm launcher.');
  }
}

function setupProxyEnvironment(config: ICypressConfig, ports: PortsFile) {
  config.env.NTLM_AUTH_PROXY = ports.ntlmProxyUrl;
  config.env.NTLM_AUTH_API = ports.configApiUrl;
  return config;
}

interface ICypressConfig {
  env: {
    NTLM_AUTH_PROXY?: string,
    NTLM_AUTH_API?: string
  }
};

export function initNtlmAuth(config: ICypressConfig): Promise<ICypressConfig> {
  return new Promise((resolve, reject) => {
    try {
      let ports = portsFileService.parse();
      validateEnvironment(ports);
      config = setupProxyEnvironment(config, ports);
      resolve(config);
    } catch (err) {
      reject(err);
    }
  });
}
