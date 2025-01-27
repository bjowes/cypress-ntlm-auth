import { TunnelAgentOptions } from "../proxy/tunnel.agent";
import https from "https";

export interface IExtendedAgentOptions
{
    /* used with https */
    proxy?: {
        host: string;
        port: number;
        secureProxy: boolean
    },
    /* used with http */
    secureProxy?: boolean
}

export type ExtendedAgentOptions = IExtendedAgentOptions & https.AgentOptions;
