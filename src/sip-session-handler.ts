import { randomUUID } from "crypto";
import { SIPHeader, SIPPacket, SIPRequestPacket, SIPResponsePacket } from "./sip-packet";
import { FromToParam, ViaParam } from "./sip-utils";
import { EventEmitter } from "stream";
import { SIPServer } from "./sip-server";
import { SIPRequestPacketBuilderAdditional } from "./sip-packet-builder";

interface RecievedPacket {
    hash: number,
    dateRecieved: number
}

interface SIPSessionHandlerConfig {
    recievedPacketTTL?: number,
    sessionTTL?: number
}

interface SIPSessionHandlerInternalConfig {
    recievedPacketTTL: number,
    sessionTTL: number
}


class SIPSessionHandler extends EventEmitter {

    public requestSessions: SIPRequestSession[] = [];
    public responseSessions: SIPResponseSession[] = [];
    public recievedPackets: RecievedPacket[] = [];
    public server: SIPServer;
    public config: SIPSessionHandlerInternalConfig;

    constructor(server: SIPServer, config?: SIPSessionHandlerConfig) {
        super();
        this.config = (config || { recievedPacketTTL: 20000, sessionTTL: 60000 }) as SIPSessionHandlerInternalConfig;
        this.server = server;
        this.server.on("request", this.onRequest.bind(this));
        this.server.on("response", this.onResponse.bind(this));
        setInterval(this.maintainRecievedPackets.bind(this), 10000);
    }

    private getPacketId(packet: SIPPacket) {
        let param = new FromToParam(packet.getHeaderValue("From"))

        return (packet.getHeaderValue("Call-Id")) + param.addressParams.get("tag");
    }

    private addPacketToRecieved(packet: SIPPacket) {
        this.recievedPackets.push({ hash: packet.hashCode(), dateRecieved: Date.now() });
    }

    public isPackedRecieved(packet: SIPPacket) {
        let hashCode = packet.hashCode();
        for (let i of this.recievedPackets) {
            if (i.hash === hashCode)
                return true;
        }
        return false;
    }

    private onRequest(packet: SIPRequestPacket) {
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



    private onResponse(packet: SIPResponsePacket) {
        if (this.isPackedRecieved(packet))
            return;
        this.addPacketToRecieved(packet);
        let packetId = this.getPacketId(packet);
        let session = this.requestSessions.filter(i => i.id == packetId)[0];
        if (!!session)
            session.onResponse(packet);

    }

    public createRequestSession(data: {
        caller: { number: string, domain: string }
        called: { number: string, domain: string },
        callId?: string
    }) {
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

    public removeSession(id: string) {
        this.requestSessions = this.requestSessions.filter(i => i.id !== id);

        this.responseSessions = this.responseSessions.filter(i => i.id !== id);
    }

    public maintainRecievedPackets() {
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

abstract class SIPSession extends EventEmitter {


    public callId: string;
    public from: FromToParam;
    public to: FromToParam;
    public appendHeaders: SIPHeader[] = [];

    public lastMessageTime: number = Date.now();

    public handler: SIPSessionHandler;

    constructor(handler: SIPSessionHandler, callId: string, from: FromToParam, to: FromToParam) {
        super();
        this.handler = handler;
        this.callId = callId;
        this.from = from;
        this.to = to;
    }

    get fromTag() {
        return this.from.addressParams.get("tag")
    }

    get toTag() {
        return this.to.addressParams.get("tag")
    }

    get id() {
        return this.callId + this.fromTag// + this.toTag;
    }


    public appendHeader(name: string, value: string) {
        this.appendHeaders.push({ name, value });
    }

    public destroy() {
        this.handler.removeSession(this.id);
        this.emit('destroy');
    }

}

class SIPRequestSession extends SIPSession {

    constructor(data: {
        caller: { number: string, domain: string }
        called: { number: string, domain: string },
        callId?: string,
        handler: SIPSessionHandler
    }) {
        super(data.handler, data.callId || randomUUID(),
            FromToParam.create({
                domain: data.caller.domain,
                username: data.caller.number,
                addressParams: {
                    tag: randomUUID()
                }
            }), FromToParam.create({
                domain: data.called.domain,
                username: data.called.number
            })
        );
    }

    public createRequest(address: string, port: number, additional?: SIPRequestPacketBuilderAdditional) {
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

    public onResponse(packet: SIPResponsePacket) {
        this.lastMessageTime = Date.now();
        {
            let toHeader = packet.getHeader("To");
            if (toHeader && !this.toTag) {
                let tag = new FromToParam(toHeader).addressParams.get("tag");
                if (tag)
                    this.to.addressParams.set("tag", tag)
            }
        }
        this.emit("response", packet);
    }

}

class SIPResponseSession extends SIPSession {

    constructor(data: {
        packet: SIPRequestPacket,
        handler: SIPSessionHandler
    }) {
        let { handler, packet } = data;
        super(handler, packet.getHeaderValue("Call-Id"), new FromToParam(packet.getHeaderValue("From")), new FromToParam(packet.getHeaderValue("To")));
        this.once('newListener', (event) => {
            if (event === 'request') {
                setImmediate(() => {
                    this.emit("request", packet);
                });
            }
        });

    }

    public onRequest(packet: SIPRequestPacket) {
        this.lastMessageTime = Date.now();
        this.emit("request", packet);
    }

}

export {
    SIPResponseSession,
    SIPRequestSession,
    SIPSessionHandler
}