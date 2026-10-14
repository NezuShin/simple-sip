import { EventEmitter } from 'events';
import { SIPRequestPacketBuilder, SIPRequestPacketBuilderAdditional } from './sip-packet-builder';
import { SIPTransactionManager } from './sip-transaction';
import { SIPTransactionConfig } from './sip-timers';
interface AddrInfo {
    address: string;
    port: number;
}
interface SIPServerConfig {
    transaction?: SIPTransactionConfig;
}
declare class SIPServer extends EventEmitter {
    private server;
    private currentCSeq;
    bindAddres: AddrInfo;
    externalAddres: AddrInfo;
    transactions: SIPTransactionManager;
    constructor(config?: SIPServerConfig);
    bind(port: number, address?: string | undefined | null): Promise<void>;
    private onMessage;
    sendPacket(data: Buffer, addrInfo: AddrInfo): Promise<void>;
    nextCSeq(): number;
    private onError;
    createRequest(address: string, port: number, additional?: SIPRequestPacketBuilderAdditional): SIPRequestPacketBuilder;
    close(): Promise<void>;
    private onServerListening;
}
export { SIPServer, SIPServerConfig, AddrInfo, };
//# sourceMappingURL=sip-server.d.ts.map