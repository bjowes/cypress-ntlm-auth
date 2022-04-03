import { IContext } from "@bjowes/http-mitm-proxy";
import { injectable, inject } from "inversify";
import http from "http";
import https from "https";
import { NtlmStateEnum } from "../models/ntlm.state.enum";
import { IConnectionContext } from "./interfaces/i.connection.context";
import { INegotiateManager } from "./interfaces/i.negotiate.manager";
import { TYPES } from "./dependency.injection.types";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";

@injectable()
export class NegotiateManager implements INegotiateManager {
  private _debug: IDebugLogger;

  constructor(@inject(TYPES.IDebugLogger) debug: IDebugLogger) {
    this._debug = debug;
  }

  handshake(
    ctx: IContext,
    ntlmHostUrl: URL,
    context: IConnectionContext,
    callback: (
      error?: NodeJS.ErrnoException,
      res?: http.IncomingMessage
    ) => void
  ) {
    context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
    let requestToken: string;
    try {
      requestToken = context.winSso.createAuthRequestHeader();
    } catch (err) {
      return callback(err as NodeJS.ErrnoException, ctx.serverToProxyResponse);
    }
    this.dropOriginalResponse(ctx);
    const originalRequestOptions: https.RequestOptions = {
      method: ctx.proxyToServerRequestOptions.method,
      path: ctx.proxyToServerRequestOptions.path,
      host: ctx.proxyToServerRequestOptions.host,
      port: ctx.proxyToServerRequestOptions.port,
      agent: ctx.proxyToServerRequestOptions.agent,
      headers: ctx.proxyToServerRequestOptions.headers,
    };
    const requestOptions = { ...originalRequestOptions };
    requestOptions.headers = {};
    requestOptions.headers["authorization"] = requestToken;
    requestOptions.headers["connection"] = "keep-alive";
    if (context.useUpstreamProxy) {
      requestOptions.headers["proxy-connection"] = "keep-alive";
    }
    const proto = ctx.isSSL ? https : http;
    const req = proto.request(requestOptions, (res) =>
      this.handshakeResponse(
        res,
        ntlmHostUrl,
        context,
        originalRequestOptions,
        ctx.isSSL,
        callback
      )
    );
    req.on("error", (err) => {
      this._debug.log(
        "Error while sending Negotiate message token request:",
        err
      );
      context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
      return callback(err);
    });
    this._debug.log("Sending Negotiate message token request");
    this.debugHeader(requestToken, true);
    context.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);
    req.end();
  }

  private handshakeResponse(
    res: http.IncomingMessage,
    ntlmHostUrl: URL,
    context: IConnectionContext,
    originalRequestOptions: https.RequestOptions,
    isSSL: boolean,
    callback: (
      error?: NodeJS.ErrnoException,
      res?: http.IncomingMessage
    ) => void
  ) {
    res.pause();

    if (this.containsNegotiateToken(res) === false) {
      if (this.acceptsNegotiateAuthentication(res) === false) {
        this._debug.log(
          "Negotiate authentication failed (www-authenticate with Negotiate not found in server response) with host",
          ntlmHostUrl.href
        );
        context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
        return callback(
          new Error(
            "Negotiate authentication failed " +
              "(www-authenticate with Negotiate not found in server response) with host " +
              ntlmHostUrl.href
          ),
          res
        );
      } else if (res.statusCode === 401) {
        this._debug.log(
          "Negotiate authentication failed (invalid credentials) with host",
          ntlmHostUrl.href
        );
        context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
        return callback(undefined, res);
      } else {
        this._debug.log(
          "Negotiate authentication failed (server responded without token) with host",
          ntlmHostUrl.href
        );
        context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
        return callback(undefined, res);
      }
    }

    context.setState(ntlmHostUrl, NtlmStateEnum.Type2Received);
    let responseToken: string;
    try {
      responseToken = context.winSso.createAuthResponseHeader(
        res.headers["www-authenticate"] || ""
      );
    } catch (err) {
      context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
      return callback(err as NodeJS.ErrnoException, res);
    }

    if (!responseToken && res.statusCode !== 401) {
      this._debug.log(
        "Negotiate authentication successful with host",
        ntlmHostUrl.href
      );
      context.setState(ntlmHostUrl, NtlmStateEnum.Authenticated);
      return callback(undefined, res);
    }
    if (!responseToken && res.statusCode === 401) {
      this._debug.log(
        "Negotiate authentication failed (invalid credentials) with host",
        ntlmHostUrl.href
      );
      context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
      return callback(undefined, res);
    }
    // TODO - do we need to handle responseToken && res.statusCode !== 401 ?

    const requestOptions: https.RequestOptions = {
      method: originalRequestOptions.method,
      path: originalRequestOptions.path,
      host: originalRequestOptions.host,
      port: originalRequestOptions.port,
      agent: originalRequestOptions.agent,
      headers: originalRequestOptions.headers,
    };
    if (requestOptions.headers) {
      // Always true, silent the compiler
      requestOptions.headers["authorization"] = responseToken;
    }
    res.on("end", () => {
      const proto = isSSL ? https : http;
      const req = proto.request(requestOptions, (res) =>
        this.handshakeResponse(
          res,
          ntlmHostUrl,
          context,
          originalRequestOptions,
          isSSL,
          callback
        )
      );
      req.on("error", (err) => {
        this._debug.log(
          "Error while sending Negotiate message token response:",
          err
        );
        context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
        return callback(err);
      });
      this._debug.log(
        "Sending Negotiate message token response with initial client request"
      );
      this.debugHeader(responseToken, true);
      context.setState(ntlmHostUrl, NtlmStateEnum.Type3Sent);
      req.write(context.getRequestBody());
      req.end();
    });
    res.resume();
  }

  private dropOriginalResponse(ctx: IContext) {
    ctx.onResponseData((ctx, chunk, callback) => {
      return;
    });
    ctx.onResponseEnd((ctx, callback) => {
      return;
    });
    ctx.serverToProxyResponse.resume();
  }

  acceptsNegotiateAuthentication(res: http.IncomingMessage): boolean {
    // Ensure that we're talking Negotiate here
    const wwwAuthenticate = res.headers["www-authenticate"];
    if (
      wwwAuthenticate &&
      wwwAuthenticate.split(", ").indexOf("Negotiate") !== -1
    ) {
      return true;
    }
    return false;
  }

  private containsNegotiateToken(res: http.IncomingMessage): boolean {
    const wwwAuthenticate = res.headers["www-authenticate"];
    if (wwwAuthenticate && wwwAuthenticate.startsWith("Negotiate ")) {
      return true;
    }
    return false;
  }

  private debugHeader(obj: any, brackets: boolean) {
    if (
      process.env.DEBUG_NTLM_HEADERS &&
      process.env.DEBUG_NTLM_HEADERS === "1"
    ) {
      if (brackets) {
        this._debug.log("[" + obj + "]");
      } else {
        this._debug.log(obj);
      }
    }
  }
}
