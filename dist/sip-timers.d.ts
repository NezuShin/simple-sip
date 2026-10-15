/** RFC 3261 default timer values (UDP), in milliseconds. */
declare const SIP_TIMER_DEFAULTS: {
    readonly timerT1: 500;
    readonly timerT2: 4000;
    readonly timerT4: 5000;
    /** Timer D for UDP (32s). */
    readonly timerD: 32000;
};
interface SIPTransactionConfig {
    timerT1?: number;
    timerT2?: number;
    timerT4?: number;
    timerD?: number;
    /** When true, skip Timers A/E/G request/response retransmits. */
    reliableTransport?: boolean;
    clientRetransmit?: boolean;
    serverRetransmit?: boolean;
    /** Resend last 2xx when a matching INVITE retransmit arrives. */
    invite2xxServerRetransmit?: boolean;
    /** When false, pass through with no transaction state or timers. */
    enabled?: boolean;
    /**
     * How INVITE client non-2xx ACKs are sent. Default `auto`.
     * Real customize signature: Non2xxAckCustomize in sip-transaction.
     */
    non2xxAckMode?: "auto" | "manual";
    /**
     * Optional ACK builder hook (sync or async).
     * `(tx: InviteClientTransaction, response: SIPResponsePacket, builder: SIPRequestPacketBuilder) => SIPRequestPacketBuilder | void | Promise<...>`
     */
    non2xxAckCustomize?: (...args: any[]) => any;
}
interface SIPTransactionResolvedConfig {
    timerT1: number;
    timerT2: number;
    timerT4: number;
    timerD: number;
    reliableTransport: boolean;
    clientRetransmit: boolean;
    serverRetransmit: boolean;
    invite2xxServerRetransmit: boolean;
    enabled: boolean;
    non2xxAckMode: "auto" | "manual";
    non2xxAckCustomize?: (...args: any[]) => any;
}
declare function resolveTransactionConfig(partial?: SIPTransactionConfig): SIPTransactionResolvedConfig;
/** Named timeout registry; all cleared on terminate. */
declare class NamedTimers {
    private handles;
    set(name: string, ms: number, fn: () => void): void;
    clear(name: string): void;
    clearAll(): void;
}
export { SIP_TIMER_DEFAULTS, SIPTransactionConfig, SIPTransactionResolvedConfig, resolveTransactionConfig, NamedTimers, };
//# sourceMappingURL=sip-timers.d.ts.map