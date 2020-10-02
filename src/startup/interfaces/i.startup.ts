export interface IStartup {
  argumentsToCypressMode(args: string[]): string | undefined;
  prepareOptions(args: string[]): Promise<any>;
  run(options: any): Promise<any>;
  open(options: any): Promise<any>;
  stop(): Promise<void>;
}
