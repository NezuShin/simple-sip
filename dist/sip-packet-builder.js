import { SIPMethodType } from './sip-packet-helper';
import { SIPCodes } from './sip-codes';
import { ViaParam } from './sip-utils';
import { randomUUID } from 'crypto';
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
        return `SIP/2.0 ${this.statusCode} ${this.statusText || SIPCodes.getCodeName(this.statusCode)}`;
    }
}
class SIPRequestPacketBuilder extends SIPPacketBuilder {
    via;
    method = SIPMethodType.INVITE;
    requestURI = '';
    additional;
    constructor(server, addrInfo, additional) {
        super(server, addrInfo);
        this.additional = additional || {};
        this.via = ViaParam.create({
            address: server.getLocalAddress(),
            port: server.bindAddres?.port,
            params: {
                rport: "",
                branch: this.additional?.viaBranch || randomUUID()
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
export { SIPPacketBuilder, SIPRequestPacketBuilder, SIPResponsePacketBuilder };
//# sourceMappingURL=sip-packet-builder.js.map