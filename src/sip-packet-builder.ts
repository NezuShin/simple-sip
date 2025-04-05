import { SIPMethodType, SIPHeader } from './sip-packet-helper';
import { AddrInfo, SIPServer } from './sip-server'
import { SIPCodes } from './sip-codes'
import { ViaParam } from './sip-utils';
import { randomUUID } from 'crypto';


abstract class SIPPacketBuilder {

    public headers: SIPHeader[] = [];
    public server: SIPServer;
    public addrInfo: AddrInfo;
    public body: string = '';

    public constructor(server: SIPServer, addrInfo: AddrInfo) {
        this.server = server;
        this.addrInfo = addrInfo;
    }

    public addHeader(name: string, value: any) {
        this.headers.push({ name, value: `${value}` });
        return this;
    }

    public hasHeader(name: string) {
        name = name.toUpperCase();
        for (let i of this.headers) {
            if (i.name.toUpperCase() == name)
                return true;
        }
        return false;
    }

    public setBody(body: string) {
        this.body = body;
        return this;
    }

    protected abstract prepareRequestLine(): string;


    public async send() {
        await this.server.sendPacket(Buffer.from(this.preparePacket()), this.addrInfo);
    }

    protected abstract prepareHeaders(): SIPHeader[];

    protected preparePacket(): string {
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


    public statusCode: number = 200;
    public statusText: string | null = null;

    public constructor(server: SIPServer, addrInfo: AddrInfo) {
        super(server, addrInfo);
    }


    public setStatusCode(statusCode: number) {
        this.statusCode = statusCode;
        return this;
    }

    public setStatusText(statusText: string) {
        this.statusText = statusText;
        return this;
    }

    protected prepareHeaders() {
        return this.headers;
    }

    protected prepareRequestLine() {
        return `SIP/2.0 ${this.statusCode} ${this.statusText || SIPCodes.getCodeName(this.statusCode)}`;
    }

}

interface SIPRequestPacketBuilderAdditional {
    viaBranch?: string,
    cSeqNum?: number
}

class SIPRequestPacketBuilder extends SIPPacketBuilder {

    public via: ViaParam;
    public method: SIPMethodType = SIPMethodType.INVITE;
    public requestURI: string = '';
    public additional: SIPRequestPacketBuilderAdditional;

    public constructor(server: SIPServer, addrInfo: AddrInfo, additional?: SIPRequestPacketBuilderAdditional) {
        super(server, addrInfo);
        this.additional = additional || {};
        this.via = ViaParam.create({
            address: server.getLocalAddress(),
            port: server.bindAddres?.port as number,
            params: {
                rport: "",
                branch: this.additional?.viaBranch || randomUUID()
            }
        });
    }

    public setMethod(method: SIPMethodType) {
        this.method = method;
        return this;
    }

    public setRequestURI(requestURI: string) {
        this.requestURI = requestURI;
        return this;
    }

    protected prepareHeaders(): SIPHeader[] {
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

    protected prepareRequestLine() {
        return `${this.method} ${this.requestURI} SIP/2.0`;
    }
}

export {
    SIPPacketBuilder,
    SIPRequestPacketBuilder,
    SIPResponsePacketBuilder,
    SIPRequestPacketBuilderAdditional
}


