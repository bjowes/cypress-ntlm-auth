import url from 'url';

import { CompleteUrl } from '../models/complete.url.model';

export function toCompleteUrl(host: string, addProtocol: boolean, useSSL?: boolean): CompleteUrl {
  let hostUrl: url.UrlWithStringQuery;
  let isSSL: boolean;

  if (!host) {
    throw new Error('Could not parse empty host');
  }

  if (addProtocol) {
    if (useSSL === true) {
      host = 'https://' + host;
      isSSL = true;
    } else if (useSSL === false) {
      host = 'http://' + host;
      isSSL = false;
    } else {
      throw new Error('Must specify useSSL parameter when addProtocol is set');
    }
  } else {
    if (host.indexOf('http://') !== -1) {
      isSSL = false;
    } else if (host.indexOf('https://') !== -1) {
      isSSL = true;
    } else {
      // Protocol missing in host string, infer from standard port
      if (host.indexOf(':') !== -1 && host.split(':')[1] === '443') {
        host = 'https://' + host;
        isSSL = true;
      } else {
        host = 'http://' + host;
        isSSL = false;
      }
    }
  }

  hostUrl = url.parse(host);
  if (!hostUrl || !hostUrl.href) {
    throw new Error('Could not parse host as url');
  }

  if (!hostUrl.port) {
    let port = isSSL ? '443' : '80';
    hostUrl = url.parse(hostUrl.protocol + '//' + hostUrl.hostname + ':' + port + hostUrl.path);
  }

  if (!hostUrl.hostname || !hostUrl.port || !hostUrl.protocol || !hostUrl.href || !hostUrl.path) {
    throw new Error('Missing mandatory properties of complete url: ' + JSON.stringify(hostUrl));
  }

  const completeUrl: CompleteUrl = {
    hostname: hostUrl.hostname,
    port: hostUrl.port,
    protocol: hostUrl.protocol,
    href: hostUrl.href,
    path: hostUrl.path,
    isLocalhost: isLocalhost(hostUrl.hostname)
  };

  return completeUrl;
}

function isLocalhost(hostname: string) {
  return (hostname === 'localhost' || hostname === '127.0.0.1');
}
