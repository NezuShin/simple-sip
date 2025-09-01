import { randomUUID } from "crypto";
import { SIPHeader, SIPMethodType, SIPPacket, SIPRequestPacket, SIPResponsePacket } from "./sip-packet";
import { FromToParam, ViaParam } from "./sip-utils";
import { EventEmitter } from "stream";
import { SIPServer } from "./sip-server";
import { SIPRequestPacketBuilderAdditional } from "./sip-packet-builder";

interface SIPSessionHandlerConfig {
    recievedPacketTTL?: number,
    sessionTTL?: number
}

interface SIPSessionHandlerInternalConfig {
    recievedPacketTTL: number,
    sessionTTL: number
}


class SIPSessionHandler extends EventEmitter {
    public sessions: SIPResponseSession[] = [];
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
        let param = new FromToParam(packet instanceof SIPRequestPacket && packet.method == SIPMethodType.BYE ? packet.getHeaderValue("To") : packet.getHeaderValue("From"))

        return (packet.getHeaderValue("Call-Id")) + param.addressParams.get("tag");
    }

    private onRequest(packet: SIPRequestPacket) {
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



    private onResponse(packet: SIPResponsePacket) {
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
    public createRequestSession({ caller, called, callId, contact }: {
        caller: string
        called: string,
        contact?: string,
        callId?: string
    }) {
        let from = FromToParam.createFromString(caller);
        if (!from.addressParams.has("from"))
            from.addressParams.set("from", randomUUID());
        let session = new SIPSession({
            to: FromToParam.createFromString(called),
            from,
            contact: contact ? FromToParam.createFromString(contact) : FromToParam.createFromString(`${from.username}@${this.server.externalAddres.address}:${this.server.externalAddres.port}`),
            handler: this,
            callId: callId || randomUUID()
        });
        this.sessions.push(session);
        return session;
    }

    public removeSession(id: string) {
        this.sessions = this.sessions.filter(i => i.id !== id);
    }

    public maintainRecievedPackets() {
        for (let i of this.sessions) {
            if (Date.now() - i.lastMessageTime > (this.config.sessionTTL)) {
                i.destroy();
            }
        }
    }

}

class SIPSession extends EventEmitter {


    public callId: string;
    public from: FromToParam;
    public to: FromToParam;
    public contact?: FromToParam;
    public appendHeaders: SIPHeader[] = [];

    public cSeq: number = 0;

    public lastMessageTime: number = Date.now();

    public handler: SIPSessionHandler;

    constructor({ handler, callId, from, to, contact }:
        { handler: SIPSessionHandler, callId: string, from: FromToParam, to: FromToParam, contact?: FromToParam }) {
        super();
        this.handler = handler;
        this.callId = callId;
        this.from = from;
        this.to = to;
        this.contact = contact;

        this.nextCSeq();
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

    public nextCSeq() {
        this.cSeq = this.handler.server.nextCSeq();
    }


    public appendHeader(name: string, value: string) {
        this.appendHeaders.push({ name, value });
    }

    public replaceHeader(name: string, value: string) {
        this.appendHeaders = this.appendHeaders.filter(i => i.name !== name);
        this.appendHeaders.push({ name, value });
    }

    public destroy() {
        this.handler.removeSession(this.id);
        this.emit('destroy');
    }

    public createRequest({ address, port, viaBranch, cSeq, requestURI }: { address: string, port: number, requestURI?: string, viaBranch?: string, cSeq?: number }) {
        let ruri = requestURI ? FromToParam.createFromString(requestURI) : this.to.clone();
        ruri.addressParams.delete("tag");
        let req = this.handler.server.createRequest(address, port,
            {
                cSeqNum: cSeq ? cSeq : this.cSeq,
                viaBranch
            })
            .addHeader("From", this.from.toString())
            .addHeader("To", this.to.toString())

            .setRequestURI(ruri.toRequestURI())
            .addHeader("Call-Id", this.callId);

        if (this.contact)
            req.addHeader("Contact", this.contact.toString());

        for (let header of this.appendHeaders) {
            req.replaceHeader(header.name, header.value);
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

    public onRequest(packet: SIPRequestPacket) {
        this.lastMessageTime = Date.now();
        this.emit("request", packet);
    }

}

class SIPResponseSession extends SIPSession {

    constructor(data: {
        packet: SIPRequestPacket,
        handler: SIPSessionHandler
    }) {
        let { handler, packet } = data;
        super({
            handler,
            callId: packet.getHeaderValue("Call-Id"),
            from: new FromToParam(packet.getHeaderValue("From")),
            to: new FromToParam(packet.getHeaderValue("To")),
            contact: packet.hasHeader("Contact") ? new FromToParam(packet.getHeaderValue("Contact")) : undefined
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

export {
    SIPResponseSession,
    SIPSessionHandler
}