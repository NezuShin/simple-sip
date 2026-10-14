import { SIPMethodType, SIPHeader } from './sip-packet-helper';
import { AddrInfo, SIPServer } from './sip-server';
import { ViaParam } from './sip-utils';
import type { ClientTransaction, ServerTransaction } from './sip-transaction';
declare abstract class SIPPacketBuilder {
    headers: SIPHeader[];
    server: SIPServer;
    addrInfo: AddrInfo;
    body: string;
    constructor(server: SIPServer, addrInfo: AddrInfo);
    addHeader(name: string, value: any): this;
    replaceHeader(name: string, value: any): this;
    hasHeader(name: string): boolean;
    setBody(body: string): this;
    protected abstract prepareRequestLine(): string;
    send(): Promise<void>;
    protected abstract prepareHeaders(): SIPHeader[];
    /** Materialize the full SIP message (side-effect: may add Via/CSeq/Content-Length on requests). */
    buildPacket(): string;
}
declare class SIPResponsePacketBuilder extends SIPPacketBuilder {
    statusCode: number;
    statusText: string | null;
    serverTransaction?: ServerTransaction;
    constructor(server: SIPServer, addrInfo: AddrInfo);
    setServerTransaction(tx: ServerTransaction): this;
    setStatusCode(statusCode: number): this;
    setStatusText(statusText: string): this;
    protected prepareHeaders(): SIPHeader[];
    protected prepareRequestLine(): string;
    send(): Promise<void>;
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
    /** Headers after Via/CSeq/Content-Length materialization (safe to call after buildPacket). */
    prepareHeadersPublic(): SIPHeader[];
    protected prepareRequestLine(): string;
    /**
     * Send via the RFC 3261 client transaction layer (retransmits / matching).
     * Do not use for ACK — call send() instead.
     */
    sendTransaction(): ClientTransaction;
}
export { SIPPacketBuilder, SIPRequestPacketBuilder, SIPResponsePacketBuilder, SIPRequestPacketBuilderAdditional };
//# sourceMappingURL=sip-packet-builder.d.ts.map