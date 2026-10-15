"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonInviteServerTransaction = exports.InviteServerTransaction = exports.NonInviteClientTransaction = exports.InviteClientTransaction = exports.ServerTransaction = exports.ClientTransaction = exports.SIPTransactionManager = void 0;
const events_1 = require("events");
const sip_packet_helper_1 = require("./sip-packet-helper");
const sip_utils_1 = require("./sip-utils");
const sip_timers_1 = require("./sip-timers");
const BRANCH_MAGIC = "z9hG4bK";
function parseCSeq(value) {
    const parts = value.trim().split(/\s+/);
    return { num: parseInt(parts[0], 10), method: parts[1] || "" };
}
function viaSentBy(via) {
    return via.port ? `${via.address}:${via.port}` : via.address;
}
function clientMatchKey(branch, method) {
    return `${branch}|${method}`;
}
function serverMatchKey(branch, sentBy, method) {
    return `${branch}|${sentBy}|${method}`;
}
function headerValue(headers, name) {
    const upper = name.toUpperCase();
    for (const h of headers) {
        if (h.name.toUpperCase() === upper)
            return h.value;
    }
    return null;
}
function getTopVia(packet) {
    const raw = packet.getHeader("Via") || packet.getHeader("v");
    if (!raw)
        return null;
    return new sip_utils_1.ViaParam(raw);
}
class SIPTransaction extends events_1.EventEmitter {
    id;
    method;
    branch;
    state;
    timers = new sip_timers_1.NamedTimers();
    manager;
    config;
    constructor(manager, id, method, branch, state) {
        super();
        this.manager = manager;
        this.id = id;
        this.method = method;
        this.branch = branch;
        this.state = state;
        this.config = manager.config;
    }
    terminate() {
        this.timers.clearAll();
        this.state = "Terminated";
        this.manager.removeTransaction(this);
        this.emit("terminated");
    }
}
class ClientTransaction extends SIPTransaction {
    addrInfo;
    request;
    constructor(manager, id, method, branch, state, request) {
        super(manager, id, method, branch, state);
        this.request = request;
        this.addrInfo = request.addrInfo;
    }
    async transportSend(buffer) {
        try {
            await this.manager.server.sendPacket(buffer, this.addrInfo);
        }
        catch (err) {
            this.emit("transport-error", err);
            this.terminate();
            throw err;
        }
    }
    /** Fire-and-forget send; transport-error / terminate already handled inside transportSend. */
    fireTransportSend(buffer) {
        void this.transportSend(buffer).catch(() => { });
    }
}
exports.ClientTransaction = ClientTransaction;
class ServerTransaction extends SIPTransaction {
    request;
    lastResponseBuffer = null;
    lastStatusCode = 0;
    addrInfo;
    constructor(manager, id, method, branch, state, request) {
        super(manager, id, method, branch, state);
        this.request = request;
        this.addrInfo = { address: request.addrInfo.address, port: request.addrInfo.port };
    }
    async transportSend(buffer) {
        try {
            await this.manager.server.sendPacket(buffer, this.addrInfo);
        }
        catch (err) {
            this.emit("transport-error", err);
            this.terminate();
            throw err;
        }
    }
    /** Fire-and-forget send; transport-error / terminate already handled inside transportSend. */
    fireTransportSend(buffer) {
        void this.transportSend(buffer).catch(() => { });
    }
    captureResponse(builder) {
        const packet = builder.buildPacket();
        this.lastResponseBuffer = Buffer.from(packet, "utf8");
        this.lastStatusCode = builder.statusCode;
        return this.lastResponseBuffer;
    }
}
exports.ServerTransaction = ServerTransaction;
/** No-op client tx when the transaction layer is disabled. */
class DisabledClientTransaction extends ClientTransaction {
    constructor(manager, request) {
        super(manager, clientMatchKey(request.branch, request.method), request.method, request.branch, "Terminated", request);
    }
    receiveResponse(_packet) {
        // Passthrough mode: responses are emitted on the manager without client matching.
    }
}
/** INVITE client transaction — RFC 3261 §17.1.1 */
class InviteClientTransaction extends ClientTransaction {
    timerAInterval;
    lastAckBuffer = null;
    constructor(manager, request) {
        const id = clientMatchKey(request.branch, request.method);
        super(manager, id, request.method, request.branch, "Calling", request);
        this.timerAInterval = manager.config.timerT1;
        this.startCalling();
    }
    startCalling() {
        this.fireTransportSend(this.request.buffer);
        if (this.shouldRetransmit()) {
            this.scheduleTimerA();
        }
        this.timers.set("B", 64 * this.config.timerT1, () => this.onTimerB());
    }
    shouldRetransmit() {
        return this.config.clientRetransmit && !this.config.reliableTransport;
    }
    scheduleTimerA() {
        this.timers.set("A", this.timerAInterval, () => this.onTimerA());
    }
    onTimerA() {
        if (this.state !== "Calling")
            return;
        this.fireTransportSend(this.request.buffer);
        this.timerAInterval = Math.min(this.timerAInterval * 2, this.config.timerT2);
        this.scheduleTimerA();
    }
    onTimerB() {
        if (this.state === "Calling" || this.state === "Proceeding") {
            this.emit("timeout");
            this.manager.emit("timeout", this);
            this.terminate();
        }
    }
    createNon2xxAckBuilder(response) {
        const from = headerValue(this.request.headers, "From") || "";
        const callId = headerValue(this.request.headers, "Call-Id") || headerValue(this.request.headers, "Call-ID") || "";
        const maxForwards = headerValue(this.request.headers, "Max-Forwards") || "70";
        const to = response.getHeaderValue("To");
        return this.manager.server
            .createRequest(this.addrInfo.address, this.addrInfo.port, {
            viaBranch: this.request.branch,
            cSeqNum: this.request.cseqNum,
        })
            .setMethod(sip_packet_helper_1.SIPMethodType.ACK)
            .setRequestURI(this.request.requestURI)
            .replaceHeader("Via", this.request.viaValue)
            .addHeader("Max-Forwards", maxForwards)
            .addHeader("From", from)
            .addHeader("To", to)
            .addHeader("Call-Id", callId);
    }
    sendAck(ack) {
        const buffer = Buffer.isBuffer(ack) ? ack : Buffer.from(ack.buildPacket(), "utf8");
        this.lastAckBuffer = buffer;
        this.fireTransportSend(buffer);
    }
    /** Cache ACK after a hand `builder.send()` so Completed retransmits can resend it. */
    noteAckSent(buffer) {
        this.lastAckBuffer = buffer;
    }
    async prepareAck(response) {
        let builder = this.createNon2xxAckBuilder(response);
        const customize = this.config.non2xxAckCustomize;
        if (customize) {
            const customized = await customize(this, response, builder);
            if (customized)
                builder = customized;
        }
        return builder;
    }
    async dispatchNon2xxAck(response) {
        if (this.lastAckBuffer) {
            this.fireTransportSend(this.lastAckBuffer);
            return;
        }
        const builder = await this.prepareAck(response);
        if (this.config.non2xxAckMode === "manual") {
            const payload = { response, builder };
            this.emit("need-ack", payload);
            this.manager.emit("need-ack", this, payload);
            return;
        }
        this.sendAck(builder);
    }
    emitNon2xxFinal(packet) {
        this.emit("final", packet);
        this.manager.emit("response", packet, this);
    }
    onNon2xxAckError(err) {
        this.emit("ack-error", err);
        this.manager.emit("ack-error", this, err);
    }
    receiveResponse(packet) {
        const code = packet.statusCode;
        if (this.state === "Terminated")
            return;
        if (code >= 100 && code < 200) {
            if (this.state === "Calling") {
                this.timers.clear("A");
                this.state = "Proceeding";
            }
            this.emit("provisional", packet);
            this.manager.emit("response", packet, this);
            return;
        }
        if (code >= 200 && code < 300) {
            this.timers.clearAll();
            this.emit("final", packet);
            this.manager.emit("response", packet, this);
            this.terminate();
            return;
        }
        if (code >= 300) {
            if (this.state === "Calling" || this.state === "Proceeding") {
                this.timers.clear("A");
                this.timers.clear("B");
                this.state = "Completed";
                this.timers.set("D", this.config.timerD, () => this.terminate());
                void this.dispatchNon2xxAck(packet)
                    .catch((err) => this.onNon2xxAckError(err))
                    .finally(() => this.emitNon2xxFinal(packet));
            }
            else if (this.state === "Completed") {
                void this.dispatchNon2xxAck(packet).catch((err) => this.onNon2xxAckError(err));
            }
        }
    }
}
exports.InviteClientTransaction = InviteClientTransaction;
/** Non-INVITE client transaction — RFC 3261 §17.1.2 */
class NonInviteClientTransaction extends ClientTransaction {
    timerEInterval;
    constructor(manager, request) {
        const id = clientMatchKey(request.branch, request.method);
        super(manager, id, request.method, request.branch, "Trying", request);
        this.timerEInterval = manager.config.timerT1;
        this.startTrying();
    }
    startTrying() {
        this.fireTransportSend(this.request.buffer);
        if (this.shouldRetransmit()) {
            this.scheduleTimerE();
        }
        this.timers.set("F", 64 * this.config.timerT1, () => this.onTimerF());
    }
    shouldRetransmit() {
        return this.config.clientRetransmit && !this.config.reliableTransport;
    }
    scheduleTimerE() {
        this.timers.set("E", this.timerEInterval, () => this.onTimerE());
    }
    onTimerE() {
        if (this.state !== "Trying" && this.state !== "Proceeding")
            return;
        this.fireTransportSend(this.request.buffer);
        this.timerEInterval = this.state === "Trying"
            ? Math.min(this.timerEInterval * 2, this.config.timerT2)
            : this.config.timerT2;
        this.scheduleTimerE();
    }
    onTimerF() {
        if (this.state === "Trying" || this.state === "Proceeding") {
            this.emit("timeout");
            this.manager.emit("timeout", this);
            this.terminate();
        }
    }
    receiveResponse(packet) {
        const code = packet.statusCode;
        if (this.state === "Terminated" || this.state === "Completed")
            return;
        if (code >= 100 && code < 200) {
            if (this.state === "Trying")
                this.state = "Proceeding";
            this.emit("provisional", packet);
            this.manager.emit("response", packet, this);
            return;
        }
        if (code >= 200) {
            this.timers.clear("E");
            this.timers.clear("F");
            this.state = "Completed";
            this.emit("final", packet);
            this.manager.emit("response", packet, this);
            this.timers.set("K", this.config.timerT4, () => this.terminate());
        }
    }
}
exports.NonInviteClientTransaction = NonInviteClientTransaction;
/** INVITE server transaction — RFC 3261 §17.2.1 */
class InviteServerTransaction extends ServerTransaction {
    timerGInterval;
    constructor(manager, request, branch) {
        const via = getTopVia(request);
        const id = serverMatchKey(branch, viaSentBy(via), sip_packet_helper_1.SIPMethodType.INVITE);
        super(manager, id, sip_packet_helper_1.SIPMethodType.INVITE, branch, "Proceeding", request);
        this.timerGInterval = manager.config.timerT1;
    }
    receiveRequest(packet) {
        if (packet.method !== sip_packet_helper_1.SIPMethodType.INVITE)
            return;
        if (!this.lastResponseBuffer)
            return;
        if (this.state === "Proceeding" || this.state === "Accepted") {
            if (this.lastStatusCode >= 100 && this.lastStatusCode < 200) {
                this.fireTransportSend(this.lastResponseBuffer);
            }
            else if (this.state === "Accepted" && this.config.invite2xxServerRetransmit) {
                this.fireTransportSend(this.lastResponseBuffer);
            }
        }
        else if (this.state === "Completed" && this.config.serverRetransmit) {
            this.fireTransportSend(this.lastResponseBuffer);
        }
    }
    receiveAck(_packet) {
        if (this.state === "Completed") {
            this.timers.clear("G");
            this.timers.clear("H");
            this.state = "Confirmed";
            this.timers.set("I", this.config.timerT4, () => this.terminate());
        }
        else if (this.state === "Accepted") {
            // 2xx ACK is normally a different branch; if matched, terminate.
            this.terminate();
        }
    }
    async sendResponse(builder) {
        const buffer = this.captureResponse(builder);
        const code = builder.statusCode;
        if (code >= 100 && code < 200) {
            if (this.state === "Proceeding") {
                await this.transportSend(buffer);
            }
            return;
        }
        if (code >= 200 && code < 300) {
            this.timers.clearAll();
            this.state = "Accepted";
            await this.transportSend(buffer);
            // Remain until TU stops or INVITE retransmits stop; Timer H-like cleanup.
            this.timers.set("H", 64 * this.config.timerT1, () => this.terminate());
            return;
        }
        if (code >= 300) {
            this.timers.clearAll();
            this.state = "Completed";
            await this.transportSend(buffer);
            if (this.config.serverRetransmit && !this.config.reliableTransport) {
                this.timerGInterval = this.config.timerT1;
                this.scheduleTimerG();
            }
            this.timers.set("H", 64 * this.config.timerT1, () => {
                this.emit("timeout");
                this.terminate();
            });
        }
    }
    scheduleTimerG() {
        this.timers.set("G", this.timerGInterval, () => this.onTimerG());
    }
    onTimerG() {
        if (this.state !== "Completed" || !this.lastResponseBuffer)
            return;
        this.fireTransportSend(this.lastResponseBuffer);
        this.timerGInterval = Math.min(this.timerGInterval * 2, this.config.timerT2);
        this.scheduleTimerG();
    }
}
exports.InviteServerTransaction = InviteServerTransaction;
/** Non-INVITE server transaction — RFC 3261 §17.2.2 */
class NonInviteServerTransaction extends ServerTransaction {
    constructor(manager, request, branch) {
        const via = getTopVia(request);
        const id = serverMatchKey(branch, viaSentBy(via), request.method);
        super(manager, id, request.method, branch, "Trying", request);
    }
    receiveRequest(_packet) {
        if (!this.lastResponseBuffer)
            return;
        if ((this.state === "Completed" || this.state === "Proceeding") && this.config.serverRetransmit) {
            this.fireTransportSend(this.lastResponseBuffer);
        }
    }
    receiveAck(_packet) {
        // Non-INVITE txs do not absorb ACK.
    }
    async sendResponse(builder) {
        const buffer = this.captureResponse(builder);
        const code = builder.statusCode;
        if (code >= 100 && code < 200) {
            if (this.state === "Trying")
                this.state = "Proceeding";
            await this.transportSend(buffer);
            return;
        }
        if (code >= 200) {
            this.state = "Completed";
            await this.transportSend(buffer);
            this.timers.set("J", 64 * this.config.timerT1, () => this.terminate());
        }
    }
}
exports.NonInviteServerTransaction = NonInviteServerTransaction;
class SIPTransactionManager extends events_1.EventEmitter {
    server;
    config;
    clientTxs = new Map();
    serverTxs = new Map();
    constructor(server, config) {
        super();
        this.server = server;
        this.config = (0, sip_timers_1.resolveTransactionConfig)(config);
        this.server.on("request", (packet) => this.onRequest(packet));
        this.server.on("response", (packet) => this.onResponse(packet));
    }
    removeTransaction(tx) {
        this.clientTxs.delete(tx.id);
        this.serverTxs.delete(tx.id);
    }
    sendRequest(builder) {
        if (builder.method === sip_packet_helper_1.SIPMethodType.ACK) {
            throw new Error("ACK must use send(), not sendTransaction() (RFC 3261: 2xx ACK is not a transaction)");
        }
        const snapshot = this.snapshotOutbound(builder);
        if (!this.config.enabled) {
            const tx = new DisabledClientTransaction(this, snapshot);
            void this.server.sendPacket(snapshot.buffer, snapshot.addrInfo).catch((err) => {
                tx.emit("transport-error", err);
            });
            return tx;
        }
        const existing = this.clientTxs.get(clientMatchKey(snapshot.branch, snapshot.method));
        if (existing)
            return existing;
        const tx = snapshot.method === sip_packet_helper_1.SIPMethodType.INVITE
            ? new InviteClientTransaction(this, snapshot)
            : new NonInviteClientTransaction(this, snapshot);
        this.clientTxs.set(tx.id, tx);
        return tx;
    }
    async sendResponse(serverTx, builder) {
        if (!this.config.enabled) {
            await this.server.sendPacket(Buffer.from(builder.buildPacket(), "utf8"), builder.addrInfo);
            return;
        }
        await serverTx.sendResponse(builder);
    }
    snapshotOutbound(builder) {
        // Materialize once so CSeq/Via stick on the builder.
        const packet = builder.buildPacket();
        const headers = builder.prepareHeadersPublic();
        const viaHeader = headerValue(headers, "Via") || builder.via.toString();
        const via = new sip_utils_1.ViaParam(viaHeader);
        const branch = via.params.get("branch") || builder.via.params.get("branch") || "";
        const cseqRaw = headerValue(headers, "CSeq") || `${builder.additional.cSeqNum || 0} ${builder.method}`;
        const cseq = parseCSeq(cseqRaw);
        return {
            buffer: Buffer.from(packet, "utf8"),
            method: builder.method,
            requestURI: builder.requestURI,
            headers: headers.map(h => ({ name: h.name, value: h.value })),
            addrInfo: builder.addrInfo,
            branch,
            cseqNum: cseq.num,
            viaValue: viaHeader,
        };
    }
    onRequest(packet) {
        if (!this.config.enabled) {
            this.emit("new-request", packet, undefined);
            return;
        }
        const via = getTopVia(packet);
        if (!via) {
            this.emit("new-request", packet, undefined);
            return;
        }
        const branch = via.params.get("branch") || "";
        const sentBy = viaSentBy(via);
        if (packet.method === sip_packet_helper_1.SIPMethodType.ACK) {
            if (branch.startsWith(BRANCH_MAGIC)) {
                const inviteKey = serverMatchKey(branch, sentBy, sip_packet_helper_1.SIPMethodType.INVITE);
                const inviteTx = this.serverTxs.get(inviteKey);
                if (inviteTx) {
                    inviteTx.receiveAck(packet);
                    return;
                }
            }
            // 2xx ACK (or unmatched): deliver to TU, no server transaction.
            this.emit("new-request", packet, undefined);
            return;
        }
        if (branch.startsWith(BRANCH_MAGIC)) {
            const key = serverMatchKey(branch, sentBy, packet.method);
            const existing = this.serverTxs.get(key);
            if (existing) {
                existing.receiveRequest(packet);
                return;
            }
            const tx = packet.method === sip_packet_helper_1.SIPMethodType.INVITE
                ? new InviteServerTransaction(this, packet, branch)
                : new NonInviteServerTransaction(this, packet, branch);
            this.serverTxs.set(tx.id, tx);
            packet.serverTransaction = tx;
            this.emit("new-request", packet, tx);
            return;
        }
        // Pre-RFC3261 branch: no absorb; deliver each request.
        this.emit("new-request", packet, undefined);
    }
    onResponse(packet) {
        if (!this.config.enabled) {
            this.emit("response", packet, undefined);
            return;
        }
        const via = getTopVia(packet);
        if (!via) {
            this.emit("response", packet, undefined);
            return;
        }
        const branch = via.params.get("branch") || "";
        const cseq = parseCSeq(packet.getHeaderValue("CSeq"));
        const key = clientMatchKey(branch, cseq.method);
        const tx = this.clientTxs.get(key);
        if (tx) {
            tx.receiveResponse(packet);
            return;
        }
        this.emit("response", packet, undefined);
    }
}
exports.SIPTransactionManager = SIPTransactionManager;
//# sourceMappingURL=sip-transaction.js.map