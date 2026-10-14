"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamedTimers = exports.SIP_TIMER_DEFAULTS = void 0;
exports.resolveTransactionConfig = resolveTransactionConfig;
/** RFC 3261 default timer values (UDP), in milliseconds. */
const SIP_TIMER_DEFAULTS = {
    timerT1: 500,
    timerT2: 4000,
    timerT4: 5000,
    /** Timer D for UDP (32s). */
    timerD: 32000,
};
exports.SIP_TIMER_DEFAULTS = SIP_TIMER_DEFAULTS;
function resolveTransactionConfig(partial) {
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
    handles = new Map();
    set(name, ms, fn) {
        this.clear(name);
        const handle = setTimeout(() => {
            this.handles.delete(name);
            fn();
        }, ms);
        this.handles.set(name, handle);
    }
    clear(name) {
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
exports.NamedTimers = NamedTimers;
//# sourceMappingURL=sip-timers.js.map