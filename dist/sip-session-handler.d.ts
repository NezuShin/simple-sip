import { SIPHeader, SIPPacket, SIPRequestPacket, SIPResponsePacket } from "./sip-packet";
import { FromToParam } from "./sip-utils";
import { EventEmitter } from "stream";
import { SIPServer } from "./sip-server";
interface SIPSessionHandlerConfig {
    recievedPacketTTL?: number;
    sessionTTL?: number;
    /** When true (default), listen to the transaction layer instead of raw socket events. */
    useTransactions?: boolean;
}
interface SIPSessionHandlerInternalConfig {
    recievedPacketTTL: number;
    sessionTTL: number;
    useTransactions: boolean;
}
declare class SIPSessionHandler extends EventEmitter {
    sessions: SIPResponseSession[];
    server: SIPServer;
    config: SIPSessionHandlerInternalConfig;
    constructor(server: SIPServer, config?: SIPSessionHandlerConfig);
    private findSession;
    private onRequest;
    private onResponse;
    createRequestSession({ caller, called, callId, contact }: {
        caller: string;
        called: string;
        contact?: string;
        callId?: string;
    }): SIPSession;
    removeSession(id: string): void;
    maintainRecievedPackets(): void;
}
declare class SIPSession extends EventEmitter {
    callId: string;
    from: FromToParam;
    to: FromToParam;
    contact?: FromToParam;
    appendHeaders: SIPHeader[];
    cSeq: number;
    lastMessageTime: number;
    handler: SIPSessionHandler;
    constructor({ handler, callId, from, to, contact }: {
        handler: SIPSessionHandler;
        callId: string;
        from: FromToParam;
        to: FromToParam;
        contact?: FromToParam;
    });
    get fromTag(): string | undefined;
    get toTag(): string | undefined;
    get id(): string;
    /** True if packet Call-Id/From/To tags belong to this session (same or swapped tags). */
    matchesPacket(packet: SIPPacket): boolean;
    nextCSeq(): void;
    appendHeader(name: string, value: string): void;
    replaceHeader(name: string, value: string): void;
    destroy(): void;
    createRequest({ address, port, viaBranch, cSeq, requestURI }: {
        address: string;
        port: number;
        requestURI?: string;
        viaBranch?: string;
        cSeq?: number;
    }): import("./sip-packet-builder").SIPRequestPacketBuilder;
    onResponse(packet: SIPResponsePacket): void;
    onRequest(packet: SIPRequestPacket): void;
}
declare class SIPResponseSession extends SIPSession {
    constructor(data: {
        packet: SIPRequestPacket;
        handler: SIPSessionHandler;
    });
}
export { SIPResponseSession, SIPSessionHandler, SIPSessionHandlerConfig };
//# sourceMappingURL=sip-session-handler.d.ts.map