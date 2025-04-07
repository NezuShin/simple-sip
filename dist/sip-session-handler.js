"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIPSessionHandler = exports.SIPRequestSession = exports.SIPResponseSession = void 0;
const crypto_1 = require("crypto");
const sip_utils_1 = require("./sip-utils");
const stream_1 = require("stream");
class SIPSessionHandler extends stream_1.EventEmitter {
    requestSessions = [];
    responseSessions = [];
    recievedPackets = [];
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
    addPacketToRecieved(packet) {
        this.recievedPackets.push({ hash: packet.hashCode(), dateRecieved: Date.now() });
    }
    isPackedRecieved(packet) {
        let hashCode = packet.hashCode();
        for (let i of this.recievedPackets) {
            if (i.hash === hashCode)
                return true;
        }
        return false;
    }
    onRequest(packet) {
        if (this.isPackedRecieved(packet))
            return;
        this.addPacketToRecieved(packet);
        let packetId = this.getPacketId(packet);
        let session = this.responseSessions.filter(i => i.id == packetId)[0];
        if (!session) {
            session = new SIPResponseSession({ packet, handler: this });
            this.emit("response-session", session);
            this.responseSessions.push(session);
            return;
        }
        session.onRequest(packet);
    }
    onResponse(packet) {
        if (this.isPackedRecieved(packet))
            return;
        this.addPacketToRecieved(packet);
        let packetId = this.getPacketId(packet);
        let session = this.requestSessions.filter(i => i.id == packetId)[0];
        if (!!session)
            session.onResponse(packet);
    }
    createRequestSession(data) {
        let { caller, called, callId } = data;
        let session = new SIPRequestSession({
            called,
            caller,
            handler: this,
            callId
        });
        this.requestSessions.push(session);
        return session;
    }
    removeSession(id) {
        this.requestSessions = this.requestSessions.filter(i => i.id !== id);
        this.responseSessions = this.responseSessions.filter(i => i.id !== id);
    }
    maintainRecievedPackets() {
        this.recievedPackets = this.recievedPackets.filter(i => Date.now() - i.dateRecieved > (this.config.recievedPacketTTL));
        for (let i of this.requestSessions) {
            if (Date.now() - i.lastMessageTime > (this.config.sessionTTL)) {
                i.destroy();
            }
        }
        for (let i of this.responseSessions) {
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
    appendHeaders = [];
    lastMessageTime = Date.now();
    handler;
    constructor(handler, callId, from, to) {
        super();
        this.handler = handler;
        this.callId = callId;
        this.from = from;
        this.to = to;
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
    appendHeader(name, value) {
        this.appendHeaders.push({ name, value });
    }
    destroy() {
        this.handler.removeSession(this.id);
        this.emit('destroy');
    }
}
class SIPRequestSession extends SIPSession {
    constructor(data) {
        super(data.handler, data.callId || (0, crypto_1.randomUUID)(), sip_utils_1.FromToParam.create({
            domain: data.caller.domain,
            username: data.caller.number,
            addressParams: {
                tag: (0, crypto_1.randomUUID)()
            }
        }), sip_utils_1.FromToParam.create({
            domain: data.called.domain,
            username: data.called.number
        }));
    }
    createRequest(address, port, additional) {
        let ruri = this.to.clone();
        ruri.addressParams.delete("tag");
        let contact = this.to.clone();
        contact.addressParams.delete("tag");
        contact.uriParams.set("ab", '');
        let req = this.handler.server.createRequest(address, port, additional).addHeader("From", this.from.toString()).addHeader("To", this.to.toString())
            .addHeader("Contact", contact.toString()).setRequestURI(ruri.toRequestURI()).addHeader("Call-Id", this.callId);
        for (let header of this.appendHeaders) {
            req.addHeader(header.name, header.value);
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
}
exports.SIPRequestSession = SIPRequestSession;
class SIPResponseSession extends SIPSession {
    constructor(data) {
        let { handler, packet } = data;
        super(handler, packet.getHeaderValue("Call-Id"), new sip_utils_1.FromToParam(packet.getHeaderValue("From")), new sip_utils_1.FromToParam(packet.getHeaderValue("To")));
        this.once('newListener', (event) => {
            if (event === 'request') {
                setImmediate(() => {
                    this.emit("request", packet);
                });
            }
        });
    }
    onRequest(packet) {
        this.lastMessageTime = Date.now();
        this.emit("request", packet);
    }
}
exports.SIPResponseSession = SIPResponseSession;
//# sourceMappingURL=sip-session-handler.js.map