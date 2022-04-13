import http from "http";
import https from "https";

export interface HttpResponse {
  status?: number;
  statusText?: string;
  body?: string;
  data?: any;
}

export class HttpClient {
  static async get(
    url: URL,
    options: http.RequestOptions | https.RequestOptions
  ) {
    return this.request(url, { ...options, method: "GET" }, null);
  }

  static async post(
    url: URL,
    body: object,
    options: http.RequestOptions | https.RequestOptions
  ) {
    return this.request(url, { ...options, method: "POST" }, body);
  }

  static async request(
    url: URL,
    options: http.RequestOptions | https.RequestOptions,
    body?: object
  ) {
    return await new Promise<HttpResponse>((resolve, reject) => {
      const proto = url.protocol === "http:" ? http : https;
      const request = proto.request(url, options, (response) => {
        /*
        if (response.statusCode >= 400) {
          request.destroy(new Error());
          return resolve({
            status: response.statusCode,
            statusText: response.statusMessage,
          });
        }

        */
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

      //request.setHeader("connection", "keep-alive");

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
  /*
  static async request2(
    options: http.RequestOptions | https.RequestOptions,
    body?: object
  ) {
    return await new Promise<HttpResponse>((resolve, reject) => {
      const request = http.request(options, (response) => {
        if (response.statusCode >= 400) {
          request.destroy(new Error());
          return resolve({
            status: response.statusCode,
            statusText: response.statusMessage,
          });
        }

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
  */
}
