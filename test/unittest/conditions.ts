import { osSupported } from "win-sso";

export const describeIfWindows = (desc: string, method: () => void) =>
  osSupported() ? describe(desc, method) : describe.skip(desc, method);

export const describeIfNotWindows = (desc: string, method: () => void) =>
  !osSupported() ? describe(desc, method) : describe.skip(desc, method);
