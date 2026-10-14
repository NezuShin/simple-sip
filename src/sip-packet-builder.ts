import { SIPMethodType, SIPHeader } from './sip-packet-helper';
import { AddrInfo, SIPServer } from './sip-server'
import { SIPCodes } from './sip-codes'
import { ViaParam } from './sip-utils';
import { randomUUID } from 'crypto';
import type { ClientTransaction, ServerTransaction } from './sip-transaction';


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

    public replaceHeader(name: string, value: any) {
        this.headers = this.headers.filter(i => i.name !== name);
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
        await this.server.sendPacket(Buffer.from(this.buildPacket()), this.addrInfo);
    }

    protected abstract prepareHeaders(): SIPHeader[];

    /** Materialize the full SIP message (side-effect: may add Via/CSeq/Content-Length on requests). */
    public buildPacket(): string {
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
    public serverTransaction?: ServerTransaction;

    public constructor(server: SIPServer, addrInfo: AddrInfo) {
        super(server, addrInfo);
    }

    public setServerTransaction(tx: ServerTransaction) {
        this.serverTransaction = tx;
        return this;
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

    public async send() {
        if (this.serverTransaction) {
            await this.server.transactions.sendResponse(this.serverTransaction, this);
            return;
        }
        await super.send();
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
        let externalAddr = server.externalAddres;
        this.via = ViaParam.create({
            ...externalAddr,
            params: {
                rport: "",
                branch: this.additional?.viaBranch || 'z9hG4bKn-' + randomUUID()
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
    public prepareHeadersPublic(): SIPHeader[] {
        return this.prepareHeaders();
    }

    protected prepareRequestLine() {
        return `${this.method} ${this.requestURI} SIP/2.0`;
    }

    /**
     * Send via the RFC 3261 client transaction layer (retransmits / matching).
     * Do not use for ACK — call send() instead.
     */
    public sendTransaction(): ClientTransaction {
        return this.server.transactions.sendRequest(this);
    }
}

export {
    SIPPacketBuilder,
    SIPRequestPacketBuilder,
    SIPResponsePacketBuilder,
    SIPRequestPacketBuilderAdditional
}


