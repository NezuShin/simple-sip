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
        await this.server.sendPacket(Buffer.from(this.preparePacket()), this.addrInfo);
    }
    preparePacket() {
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
    constructor(server, addrInfo) {
        super(server, addrInfo);
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
        this.via = sip_utils_1.ViaParam.create({
            address: server.getLocalAddress(),
            port: server.bindAddres?.port,
            params: {
                rport: "",
                branch: this.additional?.viaBranch || (0, crypto_1.randomUUID)()
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
        let headers = [...this.headers];
        if (!this.hasHeader("CSeq"))
            headers.push({ name: "CSeq", value: `${this.additional.cSeqNum || this.server.nextCSeq()} ${this.method}` });
        if (!this.hasHeader("Via")) {
            headers.push({ name: "Via", value: this.via.toString() });
        }
        if (!this.hasHeader("Content-Length")) {
            headers.push({ name: "Content-Length", value: `${Buffer.from(this.body, 'utf8').length}` });
        }
        return headers;
    }
    prepareRequestLine() {
        return `${this.method} ${this.requestURI} SIP/2.0`;
    }
}
exports.SIPRequestPacketBuilder = SIPRequestPacketBuilder;
//# sourceMappingURL=sip-packet-builder.js.map