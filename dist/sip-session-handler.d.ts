import { SIPHeader, SIPPacket, SIPRequestPacket, SIPResponsePacket } from "./sip-packet";
import { FromToParam } from "./sip-utils";
import { EventEmitter } from "stream";
import { SIPServer } from "./sip-server";
import { SIPRequestPacketBuilderAdditional } from "./sip-packet-builder";
interface RecievedPacket {
    hash: number;
    dateRecieved: number;
}
interface SIPSessionHandlerConfig {
    recievedPacketTTL?: number;
    sessionTTL?: number;
    ignoreResents?: boolean;
}
interface SIPSessionHandlerInternalConfig {
    recievedPacketTTL: number;
    sessionTTL: number;
    ignoreResents: boolean;
}
declare class SIPSessionHandler extends EventEmitter {
    requestSessions: SIPRequestSession[];
    responseSessions: SIPResponseSession[];
    recievedPackets: RecievedPacket[];
    server: SIPServer;
    config: SIPSessionHandlerInternalConfig;
    constructor(server: SIPServer, config?: SIPSessionHandlerConfig);
    private getPacketId;
    private addPacketToRecieved;
    isPackedRecieved(packet: SIPPacket): boolean;
    private onRequest;
    private onResponse;
    createRequestSession(data: {
        caller: {
            number: string;
            domain: string;
        };
        called: {
            number: string;
            domain: string;
        };
        callId?: string;
    }): SIPRequestSession;
    removeSession(id: string): void;
    maintainRecievedPackets(): void;
}
declare abstract class SIPSession extends EventEmitter {
    callId: string;
    from: FromToParam;
    to: FromToParam;
    appendHeaders: SIPHeader[];
    lastMessageTime: number;
    handler: SIPSessionHandler;
    constructor(handler: SIPSessionHandler, callId: string, from: FromToParam, to: FromToParam);
    get fromTag(): string | undefined;
    get toTag(): string | undefined;
    get id(): string;
    appendHeader(name: string, value: string): void;
    destroy(): void;
}
declare class SIPRequestSession extends SIPSession {
    constructor(data: {
        caller: {
            number: string;
            domain: string;
        };
        called: {
            number: string;
            domain: string;
        };
        callId?: string;
        handler: SIPSessionHandler;
    });
    createRequest(address: string, port: number, additional?: SIPRequestPacketBuilderAdditional): import("./sip-packet-builder").SIPRequestPacketBuilder;
    onResponse(packet: SIPResponsePacket): void;
}
declare class SIPResponseSession extends SIPSession {
    constructor(data: {
        packet: SIPRequestPacket;
        handler: SIPSessionHandler;
    });
    onRequest(packet: SIPRequestPacket): void;
}
export { SIPResponseSession, SIPRequestSession, SIPSessionHandler };
//# sourceMappingURL=sip-session-handler.d.ts.map