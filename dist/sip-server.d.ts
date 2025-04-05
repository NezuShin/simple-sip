import { EventEmitter } from 'events';
import { SIPRequestPacketBuilder, SIPRequestPacketBuilderAdditional } from './sip-packet-builder';
interface AddrInfo {
    address: string;
    port: number;
}
declare class SIPServer extends EventEmitter {
    private server;
    private currentCSeq;
    bindAddres?: AddrInfo;
    constructor();
    bind(port: number, address?: string | undefined | null): Promise<void>;
    private onMessage;
    sendPacket(data: Buffer, addrInfo: AddrInfo): Promise<void>;
    nextCSeq(): number;
    private onError;
    createRequest(address: string, port: number, additional?: SIPRequestPacketBuilderAdditional): SIPRequestPacketBuilder;
    getLocalAddress(): string;
    close(): Promise<void>;
    private onServerListening;
}
export { SIPServer, AddrInfo, };
//# sourceMappingURL=sip-server.d.ts.map