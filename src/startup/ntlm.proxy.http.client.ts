import { inject, injectable } from "inversify";
import { INtlmProxyHttpClient } from "./interfaces/i.ntlm.proxy.http.client";
import http from "node:http";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { TYPES } from "../proxy/dependency.injection.types";
import { URLExt } from "../util/url.ext";

/**
 * HTTP client for requests to NTML proxy (internal or external)
 */
@injectable()
export class NtlmProxyHttpClient implements INtlmProxyHttpClient {
    private _debug: IDebugLogger;

  /**
   * Constructor
   * @param debug Debug logger 
   * @param httpClient Interface for http requests
   */
    constructor(@inject(TYPES.IDebugLogger) debug: IDebugLogger) {
        this._debug = debug;
    }

    request(configApiUrl: string, path: string, method: string, body: object | undefined): Promise<object | undefined> {
        return new Promise<object | undefined>((resolve, reject) => {
            this._debug.log("Sending " + path + " request to NTLM proxy " + configApiUrl);
            const configApiUrlParsed = new URL(configApiUrl);
            const options: http.RequestOptions = {
                hostname: URLExt.unescapeHostname(configApiUrlParsed),
                port: URLExt.portOrDefault(configApiUrlParsed),
                path: "/" + path,
                method: method,
                timeout: 3000,
            };
            const req = http.request(options, (res) => {
                let resBody = "";
                res.on("data", (chunk) => (resBody += chunk));
                res.on("end", () => {
                    if (res.statusCode !== 200) {
                        this._debug.log("Unexpected response from NTLM proxy: " + res.statusCode);
                        this._debug.log("Response body: " + resBody);
                        this._debug.log(path + " request failed");
                        return reject(new Error("Unexpected response from NTLM proxy: " + res.statusCode));
                    }
        
                    this._debug.log(path + " request succeeded");
                    if (!resBody || resBody === "OK") {
                        return resolve(undefined);
                    } else {
                        this._debug.log(path + " response body " + resBody);
                        return resolve(JSON.parse(resBody));
                    }
                });
            });
    
            req.on("error", (error) => {
                this._debug.log(path + " request failed");
                return reject(new Error("An error occurred while communicating with NTLM proxy: " + error.message));
            });
    
            if (body) {
                const bodyStr = JSON.stringify(body);
                req.setHeader("Content-Type", "application/json");
                req.setHeader("Content-Length", bodyStr.length);
                req.write(bodyStr);
            }
            req.end();
        });
    }
}