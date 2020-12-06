import net from 'net';

export class ResetServer {
  private server?: net.Server;

  port() {
    const { port } = this.server.address() as net.AddressInfo;
    return port;
  }

  url() {
    return 'http://localhost:' + this.port();
  }

  start() {
    this.server = net.createServer(
      clientSocket => clientSocket.destroy()
    );
    this.server.on('error', err => {
      throw err;
    });
    this.server.listen(0);
  }

  stop() {
    this.server.close();
    this.server = undefined;
  }
}
