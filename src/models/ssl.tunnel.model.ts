import { Socket } from "net";

export interface SslTunnel {
  client: Socket;
  target: Socket;
}
