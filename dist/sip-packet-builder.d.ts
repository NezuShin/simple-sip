import { SIPMethodType, SIPHeader } from './sip-packet-helper';
import { AddrInfo, SIPServer } from './sip-server';
import { ViaParam } from './sip-utils';
declare abstract class SIPPacketBuilder {
    headers: SIPHeader[];
    server: SIPServer;
    addrInfo: AddrInfo;
    body: string;
    constructor(server: SIPServer, addrInfo: AddrInfo);
    addHeader(name: string, value: any): this;
    hasHeader(name: string): boolean;
    setBody(body: string): this;
    protected abstract prepareRequestLine(): string;
    send(): Promise<void>;
    protected abstract prepareHeaders(): SIPHeader[];
    protected preparePacket(): string;
}
declare class SIPResponsePacketBuilder extends SIPPacketBuilder {
    statusCode: number;
    statusText: string | null;
    constructor(server: SIPServer, addrInfo: AddrInfo);
    setStatusCode(statusCode: number): this;
    setStatusText(statusText: string): this;
    protected prepareHeaders(): SIPHeader[];
    protected prepareRequestLine(): string;
}
interface SIPRequestPacketBuilderAdditional {
    viaBranch?: string;
    cSeqNum?: number;
}
declare class SIPRequestPacketBuilder extends SIPPacketBuilder {
    via: ViaParam;
    method: SIPMethodType;
    requestURI: string;
    additional: SIPRequestPacketBuilderAdditional;
    constructor(server: SIPServer, addrInfo: AddrInfo, additional?: SIPRequestPacketBuilderAdditional);
    setMethod(method: SIPMethodType): this;
    setRequestURI(requestURI: string): this;
    protected prepareHeaders(): SIPHeader[];
    protected prepareRequestLine(): string;
}
export { SIPPacketBuilder, SIPRequestPacketBuilder, SIPResponsePacketBuilder, SIPRequestPacketBuilderAdditional };
//# sourceMappingURL=sip-packet-builder.d.ts.map