import url from "url";

import { CompleteUrl } from "../models/complete.url.model";

/**
 * Convert the host header to a structured CompleteUrl object
 *
 * @param {string} host value of the Host header
 * @param {boolean} addProtocol if protocol should be appended to teh host based on the useSSL flag
 * @param {boolean} useSSL true if the connection is using SSL
 * @returns {CompleteUrl} Converted from host header
 */
export function toCompleteUrl(
  host: string,
  addProtocol: boolean,
  useSSL?: boolean
): CompleteUrl {
  let hostUrl: url.UrlWithStringQuery;
  let isSSL: boolean;

  if (!host) {
    throw new Error("Could not parse empty host");
  }

  if (addProtocol) {
    if (useSSL === true) {
      host = "https://" + host;
      isSSL = true;
    } else if (useSSL === false) {
      host = "http://" + host;
      isSSL = false;
    } else {
      throw new Error("Must specify useSSL parameter when addProtocol is set");
    }
  } else {
    if (host.indexOf("http://") !== -1) {
      isSSL = false;
    } else if (host.indexOf("https://") !== -1) {
      isSSL = true;
    } else {
      // Protocol missing in host string, infer from standard port
      if (host.indexOf(":") !== -1 && host.split(":")[1] === "443") {
        host = "https://" + host;
        isSSL = true;
      } else {
        host = "http://" + host;
        isSSL = false;
      }
    }
  }

  hostUrl = url.parse(host);
  if (!hostUrl || !hostUrl.href) {
    throw new Error("Could not parse host as url");
  }

  if (!hostUrl.port) {
    const port = isSSL ? "443" : "80";
    hostUrl = url.parse(
      hostUrl.protocol + "//" + hostUrl.hostname + ":" + port + hostUrl.path
    );
  }

  if (
    !hostUrl.hostname ||
    !hostUrl.port ||
    !hostUrl.protocol ||
    !hostUrl.href ||
    !hostUrl.path
  ) {
    throw new Error(
      "Missing mandatory properties of complete url: " + JSON.stringify(hostUrl)
    );
  }

  const completeUrl: CompleteUrl = {
    hostname: hostUrl.hostname,
    port: hostUrl.port,
    protocol: hostUrl.protocol,
    href: hostUrl.href,
    path: hostUrl.path,
    isLocalhost: isLocalhost(hostUrl.hostname),
  };

  return completeUrl;
}

/**
 * Does the hostname match localhost
 *
 * @param {string} hostname hostname to match with localhost variants
 * @returns {boolean} does the hostname match localhost
 */
function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}
