"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIPResponsePacketBuilder = exports.SIPRequestPacketBuilder = exports.SIPPacketBuilder = void 0;
const sip_packet_helper_1 = require("./sip-packet-helper");
const sip_codes_1 = require("./sip-codes");
const sip_utils_1 = require("./sip-utils");
const crypto_1 = require("crypto");
class SIPPacketBuilder {
    headers = [];
    server;
    addrInfo;
    body = '';
    constructor(server, addrInfo) {
        this.server = server;
        this.addrInfo = addrInfo;
    }
    addHeader(name, value) {
        this.headers.push({ name, value: `${value}` });
        return this;
    }
    replaceHeader(name, value) {
        this.headers = this.headers.filter(i => i.name !== name);
        this.headers.push({ name, value: `${value}` });
        return this;
    }
    hasHeader(name) {
        name = name.toUpperCase();
        for (let i of this.headers) {
            if (i.name.toUpperCase() == name)
                return true;
        }
        return false;
    }
    setBody(body) {
        this.body = body;
        return this;
    }
    async send() {
        await this.server.sendPacket(Buffer.from(this.buildPacket()), this.addrInfo);
    }
    /** Materialize the full SIP message (side-effect: may add Via/CSeq/Content-Length on requests). */
    buildPacket() {
        let str = this.prepareRequestLine() + "\r\n";
        for (let i of this.prepareHeaders()) {
            str += `${i.name}: ${i.value}\r\n`;
        }
        str += '\r\n';
        str += this.body;
        return str;
    }
}
exports.SIPPacketBuilder = SIPPacketBuilder;
class SIPResponsePacketBuilder extends SIPPacketBuilder {
    statusCode = 200;
    statusText = null;
    serverTransaction;
    constructor(server, addrInfo) {
        super(server, addrInfo);
    }
    setServerTransaction(tx) {
        this.serverTransaction = tx;
        return this;
    }
    setStatusCode(statusCode) {
        this.statusCode = statusCode;
        return this;
    }
    setStatusText(statusText) {
        this.statusText = statusText;
        return this;
    }
    prepareHeaders() {
        return this.headers;
    }
    prepareRequestLine() {
        return `SIP/2.0 ${this.statusCode} ${this.statusText || sip_codes_1.SIPCodes.getCodeName(this.statusCode)}`;
    }
    async send() {
        if (this.serverTransaction) {
            await this.server.transactions.sendResponse(this.serverTransaction, this);
            return;
        }
        await super.send();
    }
}
exports.SIPResponsePacketBuilder = SIPResponsePacketBuilder;
class SIPRequestPacketBuilder extends SIPPacketBuilder {
    via;
    method = sip_packet_helper_1.SIPMethodType.INVITE;
    requestURI = '';
    additional;
    constructor(server, addrInfo, additional) {
        super(server, addrInfo);
        this.additional = additional || {};
        let externalAddr = server.externalAddres;
        this.via = sip_utils_1.ViaParam.create({
            ...externalAddr,
            params: {
                rport: "",
                branch: this.additional?.viaBranch || 'z9hG4bKn-' + (0, crypto_1.randomUUID)()
            }
        });
    }
    setMethod(method) {
        this.method = method;
        return this;
    }
    setRequestURI(requestURI) {
        this.requestURI = requestURI;
        return this;
    }
    prepareHeaders() {
        // Persist auto-headers so repeated materialization does not bump CSeq again.
        if (!this.hasHeader("CSeq"))
            this.headers.push({ name: "CSeq", value: `${this.additional.cSeqNum || this.server.nextCSeq()} ${this.method}` });
        if (!this.hasHeader("Via")) {
            this.headers.push({ name: "Via", value: this.via.toString() });
        }
        if (!this.hasHeader("Content-Length")) {
            this.headers.push({ name: "Content-Length", value: `${Buffer.from(this.body, 'utf8').length}` });
        }
        return [...this.headers];
    }
    /** Headers after Via/CSeq/Content-Length materialization (safe to call after buildPacket). */
    prepareHeadersPublic() {
        return this.prepareHeaders();
    }
    prepareRequestLine() {
        return `${this.method} ${this.requestURI} SIP/2.0`;
    }
    /**
     * Send via the RFC 3261 client transaction layer (retransmits / matching).
     * Do not use for ACK — call send() instead.
     */
    sendTransaction() {
        return this.server.transactions.sendRequest(this);
    }
}
exports.SIPRequestPacketBuilder = SIPRequestPacketBuilder;
//# sourceMappingURL=sip-packet-builder.js.map