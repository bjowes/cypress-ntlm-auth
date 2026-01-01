import http from "node:http";
import https from "node:https";

export interface HttpResponse {
  status?: number;
  statusText?: string;
  body?: string;
  data?: any;
}

export interface IHttpClient {
  get(
    url: URL,
    options: http.RequestOptions | https.RequestOptions
  ) : Promise<HttpResponse>

  post(
    url: URL,
    body: object | undefined,
    options: http.RequestOptions | https.RequestOptions
  ) : Promise<HttpResponse>

  request(
    url: URL,
    options: http.RequestOptions | https.RequestOptions,
    body: object | undefined
  ) : Promise<HttpResponse>
}

export class HttpClient implements IHttpClient {
  async get(
    url: URL,
    options: http.RequestOptions | https.RequestOptions
  ) {
    return this.request(url, { ...options, method: "GET" }, undefined);
  }

  async post(
    url: URL,
    body: object | undefined,
    options: http.RequestOptions | https.RequestOptions
  ) {
    return this.request(url, { ...options, method: "POST" }, body);
  }

  async request(
    url: URL,
    options: http.RequestOptions | https.RequestOptions,
    body: object | undefined
  ) {
    return await new Promise<HttpResponse>((resolve, reject) => {
      const proto = url.protocol === "http:" ? http : https;
      const request = proto.request(url, options, (response) => {

        const chunks: Buffer[] = [];
        response.on("data", (chunk) => {
          chunks.push(chunk);
        });

        response.once("end", () => {
          const buffer = Buffer.concat(chunks);

          return resolve({
            status: response.statusCode,
            statusText: response.statusMessage,
            body: buffer.toString(),
            data:
              response.headers["content-type"] === "application/json" ||
              response.headers["content-type"] ===
                "application/json; charset=utf-8"
                ? JSON.parse(buffer.toString("utf-8"))
                : null,
          });
        });

        response.once("error", (err) => {
          return reject(err);
        });
      });

      request.once("error", (err) => {
        return reject(err);
      });
      if (body) {
        const bodyStr = JSON.stringify(body);
        request.setHeader("content-type", "application/json; charset=utf-8");
        request.setHeader("content-length", bodyStr.length);
        request.write(bodyStr);
      }
      request.end();
    });
  }
}
