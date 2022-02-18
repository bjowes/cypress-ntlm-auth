import { Type2Message } from "../type2.message";
import { NtlmMessage } from "../ntlm.message";

export interface INtlm {
  createType1Message(ntlmVersion: number, workstation: string | undefined, target: string | undefined): NtlmMessage;
  decodeType2Message(str: string | undefined): Type2Message;
  createType3Message(
    type1message: NtlmMessage,
    type2Message: Type2Message,
    username: string,
    password: string,
    workstation: string | undefined,
    target: string | undefined,
    clientNonce: string | undefined,
    timestamp: string | undefined
  ): NtlmMessage;
}
