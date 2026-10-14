/** RFC 3261 default timer values (UDP), in milliseconds. */
const SIP_TIMER_DEFAULTS = {
    timerT1: 500,
    timerT2: 4000,
    timerT4: 5000,
    /** Timer D for UDP (32s). */
    timerD: 32000,
} as const;

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
}

function resolveTransactionConfig(partial?: SIPTransactionConfig): SIPTransactionResolvedConfig {
    return {
        timerT1: partial?.timerT1 ?? SIP_TIMER_DEFAULTS.timerT1,
        timerT2: partial?.timerT2 ?? SIP_TIMER_DEFAULTS.timerT2,
        timerT4: partial?.timerT4 ?? SIP_TIMER_DEFAULTS.timerT4,
        timerD: partial?.timerD ?? SIP_TIMER_DEFAULTS.timerD,
        reliableTransport: partial?.reliableTransport ?? false,
        clientRetransmit: partial?.clientRetransmit ?? true,
        serverRetransmit: partial?.serverRetransmit ?? true,
        invite2xxServerRetransmit: partial?.invite2xxServerRetransmit ?? true,
        enabled: partial?.enabled ?? true,
    };
}

/** Named timeout registry; all cleared on terminate. */
class NamedTimers {
    private handles: Map<string, ReturnType<typeof setTimeout>> = new Map();

    set(name: string, ms: number, fn: () => void) {
        this.clear(name);
        const handle = setTimeout(() => {
            this.handles.delete(name);
            fn();
        }, ms);
        this.handles.set(name, handle);
    }

    clear(name: string) {
        const handle = this.handles.get(name);
        if (handle !== undefined) {
            clearTimeout(handle);
            this.handles.delete(name);
        }
    }

    clearAll() {
        for (const handle of this.handles.values()) {
            clearTimeout(handle);
        }
        this.handles.clear();
    }
}

export {
    SIP_TIMER_DEFAULTS,
    SIPTransactionConfig,
    SIPTransactionResolvedConfig,
    resolveTransactionConfig,
    NamedTimers,
};
