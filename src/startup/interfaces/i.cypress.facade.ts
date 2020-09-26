export interface ICypressFacade {
  cypressLoaded(): boolean;
  run(options: any): Promise<any>;
  open(options: any): Promise<any>;
  parseRunArguments(runArguments: string[]): Promise<any>;
}
