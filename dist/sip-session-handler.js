"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIPSessionHandler = exports.SIPResponseSession = void 0;
const crypto_1 = require("crypto");
const sip_utils_1 = require("./sip-utils");
const stream_1 = require("stream");
class SIPSessionHandler extends stream_1.EventEmitter {
    sessions = [];
    server;
    config;
    constructor(server, config) {
        super();
        this.config = (config || { recievedPacketTTL: 20000, sessionTTL: 60000 });
        this.server = server;
        this.server.on("request", this.onRequest.bind(this));
        this.server.on("response", this.onResponse.bind(this));
        setInterval(this.maintainRecievedPackets.bind(this), 10000);
    }
    getPacketId(packet) {
        let param = new sip_utils_1.FromToParam(packet.getHeaderValue("From"));
        return (packet.getHeaderValue("Call-Id")) + param.addressParams.get("tag");
    }
    onRequest(packet) {
        let packetId = this.getPacketId(packet);
        let session = this.sessions.filter(i => i.id == packetId)[0];
        if (!session) {
            session = new SIPResponseSession({ packet, handler: this });
            this.emit("response-session", session);
            this.sessions.push(session);
            return;
        }
        session.onRequest(packet);
    }
    onResponse(packet) {
        let packetId = this.getPacketId(packet);
        let session = this.sessions.filter(i => i.id == packetId)[0];
        if (!!session)
            session.onResponse(packet);
    }
    /*
        {
            caller: '1337@domain.net',
            called: '1337@domain.net',
            contact: '1337@(my ip)'
        }
    */
    createRequestSession({ caller, called, callId, contact }) {
        let from = sip_utils_1.FromToParam.createFromString(caller);
        let session = new SIPSession({
            to: sip_utils_1.FromToParam.createFromString(called),
            from,
            contact: contact ? sip_utils_1.FromToParam.createFromString(contact) : sip_utils_1.FromToParam.createFromString(`${from.username}@${this.server.externalAddres.address}:${this.server.externalAddres.port}`),
            handler: this,
            callId: callId || (0, crypto_1.randomUUID)()
        });
        this.sessions.push(session);
        return session;
    }
    removeSession(id) {
        this.sessions = this.sessions.filter(i => i.id !== id);
    }
    maintainRecievedPackets() {
        for (let i of this.sessions) {
            if (Date.now() - i.lastMessageTime > (this.config.sessionTTL)) {
                i.destroy();
            }
        }
    }
}
exports.SIPSessionHandler = SIPSessionHandler;
class SIPSession extends stream_1.EventEmitter {
    callId;
    from;
    to;
    contact;
    appendHeaders = [];
    cSeq = 0;
    lastMessageTime = Date.now();
    handler;
    constructor({ handler, callId, from, to, contact }) {
        super();
        this.handler = handler;
        this.callId = callId;
        this.from = from;
        this.to = to;
        this.contact = contact;
        this.nextCSeq();
    }
    get fromTag() {
        return this.from.addressParams.get("tag");
    }
    get toTag() {
        return this.to.addressParams.get("tag");
    }
    get id() {
        return this.callId + this.fromTag; // + this.toTag;
    }
    nextCSeq() {
        this.cSeq = this.handler.server.nextCSeq();
    }
    appendHeader(name, value) {
        this.appendHeaders.push({ name, value });
    }
    replaceHeader(name, value) {
        this.appendHeaders = this.appendHeaders.filter(i => i.name !== name);
        this.appendHeaders.push({ name, value });
    }
    destroy() {
        this.handler.removeSession(this.id);
        this.emit('destroy');
    }
    createRequest({ address, port, viaBranch, cSeq, requestURI }) {
        let ruri = requestURI ? sip_utils_1.FromToParam.createFromString(requestURI) : this.to.clone();
        ruri.addressParams.delete("tag");
        let req = this.handler.server.createRequest(address, port, {
            cSeqNum: cSeq ? cSeq : this.cSeq,
            viaBranch
        })
            .addHeader("From", this.from.toString())
            .addHeader("To", this.to.toString())
            .addHeader("Contact", this.contact.toString())
            .setRequestURI(ruri.toRequestURI())
            .addHeader("Call-Id", this.callId);
        for (let header of this.appendHeaders) {
            req.replaceHeader(header.name, header.value);
        }
        return req;
    }
    onResponse(packet) {
        this.lastMessageTime = Date.now();
        {
            let toHeader = packet.getHeader("To");
            if (toHeader && !this.toTag) {
                let tag = new sip_utils_1.FromToParam(toHeader).addressParams.get("tag");
                if (tag)
                    this.to.addressParams.set("tag", tag);
            }
        }
        this.emit("response", packet);
    }
    onRequest(packet) {
        this.lastMessageTime = Date.now();
        this.emit("request", packet);
    }
}
class SIPResponseSession extends SIPSession {
    constructor(data) {
        let { handler, packet } = data;
        super({
            handler,
            callId: packet.getHeaderValue("Call-Id"),
            from: new sip_utils_1.FromToParam(packet.getHeaderValue("From")),
            to: new sip_utils_1.FromToParam(packet.getHeaderValue("To")),
            contact: new sip_utils_1.FromToParam(packet.getHeaderValue("Contact"))
        });
        this.once('newListener', (event) => {
            if (event === 'request') {
                setImmediate(() => {
                    this.emit("request", packet);
                });
            }
        });
    }
}
exports.SIPResponseSession = SIPResponseSession;
//# sourceMappingURL=sip-session-handler.js.map