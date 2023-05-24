import { IContext } from "@bjowes/http-mitm-proxy";
import { injectable, inject } from "inversify";
import http from "http";
import https from "https";
import { NtlmStateEnum } from "../models/ntlm.state.enum";
import { IConfigStore } from "./interfaces/i.config.store";
import { IConnectionContext } from "./interfaces/i.connection.context";
import { INtlmManager } from "./interfaces/i.ntlm.manager";
import { TYPES } from "./dependency.injection.types";
import { IDebugLogger } from "../util/interfaces/i.debug.logger";
import { INtlm } from "../ntlm/interfaces/i.ntlm";
import { Type2Message } from "../ntlm/type2.message";
import { NtlmMessage } from "../ntlm/ntlm.message";
import { NtlmHost } from "../models/ntlm.host.model";
import { PeerCertificate } from "tls";

@injectable()
export class NtlmManager implements INtlmManager {
  private _configStore: IConfigStore;
  private _ntlm: INtlm;
  private _debug: IDebugLogger;

  constructor(
    @inject(TYPES.IConfigStore) configStore: IConfigStore,
    @inject(TYPES.INtlm) ntlm: INtlm,
    @inject(TYPES.IDebugLogger) debug: IDebugLogger
  ) {
    this._configStore = configStore;
    this._ntlm = ntlm;
    this._debug = debug;
  }

  handshake(
    ctx: IContext,
    ntlmHostUrl: URL,
    context: IConnectionContext,
    useSso: boolean,
    callback: (
      error?: NodeJS.ErrnoException,
      res?: http.IncomingMessage
    ) => void
  ) {
    context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
    let config: NtlmHost;
    let type1msg: NtlmMessage;
    let type1header: string;
    if (useSso) {
      try {
        type1header = context.winSso.createAuthRequestHeader();
      } catch (err) {
        return callback(
          err as NodeJS.ErrnoException,
          ctx.serverToProxyResponse
        );
      }
    } else {
      const configLookup = this._configStore.get(ntlmHostUrl);
      if (!configLookup) {
        return callback(
          new Error("Cannot find NtlmHost config in handshake"),
          ctx.serverToProxyResponse
        );
      } else {
        config = configLookup;
      }
      type1msg = this._ntlm.createType1Message(
        config.ntlmVersion,
        config.workstation,
        config.domain
      );
      type1header = type1msg.header();
    }
    this.dropOriginalResponse(ctx);
    const requestOptions: https.RequestOptions = {
      method: ctx.proxyToServerRequestOptions.method,
      path: ctx.proxyToServerRequestOptions.path,
      host: ctx.proxyToServerRequestOptions.host,
      port: ctx.proxyToServerRequestOptions.port,
      agent: ctx.proxyToServerRequestOptions.agent,
    };
    requestOptions.headers = {};
    requestOptions.headers["authorization"] = type1header;
    requestOptions.headers["connection"] = "keep-alive";
    if (context.useUpstreamProxy) {
      requestOptions.headers["proxy-connection"] = "keep-alive";
    }
    const proto = ctx.isSSL ? https : http;
    const type1req = proto.request(requestOptions, (type1res) => {
      type1res.pause();

      if (this.canHandleNtlmAuthentication(type1res) === false) {
        context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
        return callback(
          new Error(
            "NTLM authentication failed (www-authenticate with NTLM not found in server response) with host " +
              ntlmHostUrl.href
          ),
          type1res
        );
      }

      context.setState(ntlmHostUrl, NtlmStateEnum.Type2Received);
      let type2msg: Type2Message;
      try {
        type2msg = this._ntlm.decodeType2Message(
          type1res.headers["www-authenticate"]
        );
        this._debug.log(
          "Received NTLM message type 2, using NTLMv" + type2msg.version
        );
        this.debugHeader(type1res.headers["www-authenticate"], true);
        this.debugHeader(type2msg, false);
      } catch (err: any) {
        this._debug.log(
          "Cannot parse NTLM message type 2 from host",
          ntlmHostUrl.href
        );
        context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
        return callback(err, type1res);
      }

      let type3msg: NtlmMessage;
      let type3header: string;
      if (useSso) {
        try {
          type3header = context.winSso.createAuthResponseHeader(
            type1res.headers["www-authenticate"] || ""
          );
        } catch (err) {
          this._debug.log("Error while creating SSO Auth response");
          return callback(err as NodeJS.ErrnoException, type1res);
        }
      } else {
        type3msg = this._ntlm.createType3Message(
          type1msg,
          type2msg,
          config.username,
          config.password,
          config.workstation,
          config.domain,
          undefined,
          undefined,
          ntlmHostUrl.hostname,
          context.peerCert
            ? this.getChannelBindingsStruct(context.peerCert)
            : undefined
        );
        type3header = type3msg.header();
      }
      const type3requestOptions: https.RequestOptions = {
        method: ctx.proxyToServerRequestOptions.method,
        path: ctx.proxyToServerRequestOptions.path,
        host: ctx.proxyToServerRequestOptions.host,
        port: ctx.proxyToServerRequestOptions.port,
        agent: ctx.proxyToServerRequestOptions.agent,
        headers: ctx.proxyToServerRequestOptions.headers,
      };
      if (type3requestOptions.headers) {
        // Always true, silent the compiler
        type3requestOptions.headers["authorization"] = type3header;
      }
      type1res.on("end", () => {
        const type3req = proto.request(type3requestOptions, (type3res) => {
          type3res.pause();
          this.handshakeResponse(type3res, ntlmHostUrl, context, () => {
            return callback(undefined, type3res);
          });
        });
        type3req.on("error", (err) => {
          this._debug.log("Error while sending NTLM message type 3");
          context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
          return callback(err);
        });
        this._debug.log(
          "Sending NTLM message type 3 with initial client request"
        );
        this.debugHeader(type3header, true);
        context.setState(ntlmHostUrl, NtlmStateEnum.Type3Sent);
        type3req.write(context.getRequestBody());
        type3req.end();
      });
      type1res.resume(); // complete message to reuse socket
    });
    type1req.on("error", (err) => {
      this._debug.log("Error while sending NTLM message type 1");
      context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
      return callback(err);
    });
    this._debug.log("Sending  NTLM message type 1");
    this.debugHeader(type1header, true);
    context.setState(ntlmHostUrl, NtlmStateEnum.Type1Sent);
    type1req.end();
  }

  private handshakeResponse(
    res: http.IncomingMessage,
    ntlmHostUrl: URL,
    context: IConnectionContext,
    callback: () => void
  ) {
    const authState = context.getState(ntlmHostUrl);
    if (authState === NtlmStateEnum.Type3Sent) {
      if (res.statusCode === 401) {
        this._debug.log(
          "NTLM authentication failed (invalid credentials) with host",
          ntlmHostUrl.href
        );
        context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
        return callback();
      }
      // According to NTLM spec, all other responses than 401 shall be treated as authentication successful
      this._debug.log(
        "NTLM authentication successful with host",
        ntlmHostUrl.href
      );
      context.setState(ntlmHostUrl, NtlmStateEnum.Authenticated);
      return callback();
    }

    this._debug.log(
      "Response from server in unexpected NTLM state " +
        authState +
        ", resetting NTLM auth. Host",
      ntlmHostUrl.href
    );
    context.setState(ntlmHostUrl, NtlmStateEnum.NotAuthenticated);
    return callback();
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

  acceptsNtlmAuthentication(res: http.IncomingMessage): boolean {
    // Ensure that we're talking NTLM here
    const wwwAuthenticate = res.headers["www-authenticate"];
    if (
      wwwAuthenticate &&
      wwwAuthenticate.toUpperCase().split(", ").indexOf("NTLM") !== -1
    ) {
      return true;
    }
    return false;
  }

  private canHandleNtlmAuthentication(res: http.IncomingMessage): boolean {
    if (res && res.statusCode === 401) {
      // Ensure that we're talking NTLM here
      const wwwAuthenticate = res.headers["www-authenticate"];
      if (wwwAuthenticate && wwwAuthenticate.startsWith("NTLM ")) {
        return true;
      }
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

  /**
   * Transforms target TLS certificate into a channel binding struct buffer
   * See https://specifications486.rssing.com/chan-58023329/article11.html
   *
   * @param {PeerCertificate} peerCert Target TLS certificate
   * @returns {Buffer} Channel binding struct buffer
   */
  private getChannelBindingsStruct(peerCert: PeerCertificate): Buffer {
    const cert: any = peerCert;
    const hash = cert.fingerprint256.replace(/:/g, "");
    const hashBuf = Buffer.from(hash, "hex");
    const tlsServerEndPoint = "tls-server-end-point:";
    const applicationDataBuffer = Buffer.alloc(
      20 + tlsServerEndPoint.length + hashBuf.length
    );
    applicationDataBuffer.writeUInt8(16, 53);
    applicationDataBuffer.write(tlsServerEndPoint, 20, "ascii");
    hashBuf.copy(applicationDataBuffer, 20 + tlsServerEndPoint.length);
    return applicationDataBuffer;
  }
}
