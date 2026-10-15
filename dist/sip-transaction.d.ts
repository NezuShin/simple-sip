import { EventEmitter } from "events";
import { AddrInfo, SIPServer } from "./sip-server";
import { SIPRequestPacket, SIPResponsePacket } from "./sip-packet";
import { SIPRequestPacketBuilder, SIPResponsePacketBuilder } from "./sip-packet-builder";
import { SIPHeader, SIPMethodType } from "./sip-packet-helper";
import { NamedTimers, SIPTransactionConfig, SIPTransactionResolvedConfig } from "./sip-timers";
type ClientTxState = "Calling" | "Trying" | "Proceeding" | "Completed" | "Terminated";
type ServerTxState = "Trying" | "Proceeding" | "Completed" | "Confirmed" | "Accepted" | "Terminated";
interface OutboundRequestSnapshot {
    buffer: Buffer;
    method: SIPMethodType;
    requestURI: string;
    headers: SIPHeader[];
    addrInfo: AddrInfo;
    branch: string;
    cseqNum: number;
    viaValue: string;
}
declare abstract class SIPTransaction extends EventEmitter {
    readonly id: string;
    readonly method: SIPMethodType;
    readonly branch: string;
    state: string;
    protected timers: NamedTimers;
    protected manager: SIPTransactionManager;
    protected config: SIPTransactionResolvedConfig;
    constructor(manager: SIPTransactionManager, id: string, method: SIPMethodType, branch: string, state: string);
    terminate(): void;
}
declare abstract class ClientTransaction extends SIPTransaction {
    readonly addrInfo: AddrInfo;
    protected request: OutboundRequestSnapshot;
    constructor(manager: SIPTransactionManager, id: string, method: SIPMethodType, branch: string, state: ClientTxState, request: OutboundRequestSnapshot);
    abstract receiveResponse(packet: SIPResponsePacket): void;
    protected transportSend(buffer: Buffer): Promise<void>;
    /** Fire-and-forget send; transport-error / terminate already handled inside transportSend. */
    protected fireTransportSend(buffer: Buffer): void;
}
declare abstract class ServerTransaction extends SIPTransaction {
    readonly request: SIPRequestPacket;
    lastResponseBuffer: Buffer | null;
    lastStatusCode: number;
    protected addrInfo: AddrInfo;
    constructor(manager: SIPTransactionManager, id: string, method: SIPMethodType, branch: string, state: ServerTxState, request: SIPRequestPacket);
    abstract receiveRequest(packet: SIPRequestPacket): void;
    abstract receiveAck(packet: SIPRequestPacket): void;
    abstract sendResponse(builder: SIPResponsePacketBuilder): Promise<void>;
    protected transportSend(buffer: Buffer): Promise<void>;
    /** Fire-and-forget send; transport-error / terminate already handled inside transportSend. */
    protected fireTransportSend(buffer: Buffer): void;
    protected captureResponse(builder: SIPResponsePacketBuilder): Buffer<ArrayBufferLike>;
}
type Non2xxAckCustomize = (tx: InviteClientTransaction, response: SIPResponsePacket, builder: SIPRequestPacketBuilder) => SIPRequestPacketBuilder | void | Promise<SIPRequestPacketBuilder | void>;
/** INVITE client transaction — RFC 3261 §17.1.1 */
declare class InviteClientTransaction extends ClientTransaction {
    private timerAInterval;
    private lastAckBuffer;
    constructor(manager: SIPTransactionManager, request: OutboundRequestSnapshot);
    private startCalling;
    private shouldRetransmit;
    private scheduleTimerA;
    private onTimerA;
    private onTimerB;
    createNon2xxAckBuilder(response: SIPResponsePacket): SIPRequestPacketBuilder;
    sendAck(ack: SIPRequestPacketBuilder | Buffer): void;
    /** Cache ACK after a hand `builder.send()` so Completed retransmits can resend it. */
    noteAckSent(buffer: Buffer): void;
    private prepareAck;
    private dispatchNon2xxAck;
    private emitNon2xxFinal;
    private onNon2xxAckError;
    receiveResponse(packet: SIPResponsePacket): void;
}
/** Non-INVITE client transaction — RFC 3261 §17.1.2 */
declare class NonInviteClientTransaction extends ClientTransaction {
    private timerEInterval;
    constructor(manager: SIPTransactionManager, request: OutboundRequestSnapshot);
    private startTrying;
    private shouldRetransmit;
    private scheduleTimerE;
    private onTimerE;
    private onTimerF;
    receiveResponse(packet: SIPResponsePacket): void;
}
/** INVITE server transaction — RFC 3261 §17.2.1 */
declare class InviteServerTransaction extends ServerTransaction {
    private timerGInterval;
    constructor(manager: SIPTransactionManager, request: SIPRequestPacket, branch: string);
    receiveRequest(packet: SIPRequestPacket): void;
    receiveAck(_packet: SIPRequestPacket): void;
    sendResponse(builder: SIPResponsePacketBuilder): Promise<void>;
    private scheduleTimerG;
    private onTimerG;
}
/** Non-INVITE server transaction — RFC 3261 §17.2.2 */
declare class NonInviteServerTransaction extends ServerTransaction {
    constructor(manager: SIPTransactionManager, request: SIPRequestPacket, branch: string);
    receiveRequest(_packet: SIPRequestPacket): void;
    receiveAck(_packet: SIPRequestPacket): void;
    sendResponse(builder: SIPResponsePacketBuilder): Promise<void>;
}
declare class SIPTransactionManager extends EventEmitter {
    readonly server: SIPServer;
    readonly config: SIPTransactionResolvedConfig;
    private clientTxs;
    private serverTxs;
    constructor(server: SIPServer, config?: SIPTransactionConfig);
    removeTransaction(tx: SIPTransaction): void;
    sendRequest(builder: SIPRequestPacketBuilder): ClientTransaction;
    sendResponse(serverTx: ServerTransaction, builder: SIPResponsePacketBuilder): Promise<void>;
    private snapshotOutbound;
    private onRequest;
    private onResponse;
}
export { SIPTransactionManager, ClientTransaction, ServerTransaction, InviteClientTransaction, NonInviteClientTransaction, InviteServerTransaction, NonInviteServerTransaction, SIPTransactionConfig, Non2xxAckCustomize, };
//# sourceMappingURL=sip-transaction.d.ts.map