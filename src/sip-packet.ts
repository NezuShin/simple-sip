import { RemoteInfo, Socket } from 'dgram';
import { SIPResponsePacketBuilder } from './sip-packet-builder';
import { SIPPacketType, SIPMethodType, SIPHeader, HeaderNotFoundError } from './sip-packet-helper';
import { SIPServer } from './sip-server';
import { ViaParam } from './sip-utils';

abstract class SIPPacket {


    protected str: string = '';
    protected server: SIPServer;
    public addrInfo: RemoteInfo;
    public body!: string;

    public headers: SIPHeader[] = [];
    public type: SIPPacketType = SIPPacketType.Request;

    public constructor(str: string, server: SIPServer, addrInfo: RemoteInfo) {
        this.str = str;
        this.server = server;
        this.addrInfo = addrInfo;
        this.parseHeaders();
        this.parseBody();
    }


    public getHeader(name: string): string | null {
        for (let i of this.headers) {
            if (i.name.toUpperCase() == name.toUpperCase())
                return i.value;
        }
        return null;
    }

    public hashCode() {

        let hash = 0,
            i, chr;
        if (this.str.length === 0) return hash;
        for (i = 0; i < this.str.length; i++) {
            chr = this.str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    public getHeaderValue(name: string): string {
        for (let i of this.headers) {
            if (i.name.toUpperCase() == name.toUpperCase())
                return i.value;
        }
        throw new HeaderNotFoundError(`Could not found header ${name}`);
    }

    private parseBody() {
        let div = "\r\n\r\n";
        this.body = this.str.substring(this.str.indexOf(div) + div.length, this.str.length);
    }

    private parseHeaders() {
        let split = this.str.split("\r\n");

        for (let i = 1; i < split.length; i++) {
            let str = split[i];

            if (!str.length) {
                return;
            }
            let index = str.indexOf(':');
            this.headers.push({ name: str.substring(0, index), value: str.substring(index + 1, str.length).trim() });
        }
    }

    public static decode(str: string, server: SIPServer, addrInfo: RemoteInfo): SIPRequestPacket | SIPResponsePacket {

        if (str.toLowerCase().startsWith('sip')) {
            return new SIPResponsePacket(str, server, addrInfo);
        }
        return new SIPRequestPacket(str, server, addrInfo);
    }
}


class SIPRequestPacket extends SIPPacket {
    public method: SIPMethodType = SIPMethodType.INFO;

    public constructor(str: string, server: SIPServer, addrInfo: RemoteInfo) {
        super(str, server, addrInfo);
        this.type = SIPPacketType.Request;
        this.parseRequestLine();
    }

    private parseRequestLine() {
        let stringMethod = this.str.substring(0, this.str.indexOf(" "));
        this.method = stringMethod as SIPMethodType;
    }

    public createResponse() {
        let via = new ViaParam(this.getHeaderValue("Via"));

        if (via.params.has("rport")) {
            if (via.params.get("rport") == "") {
                via.params.set("rport", `${this.addrInfo.port}`);
                via.params.set("received", `${this.addrInfo.address}`);
            };
        }

        return new SIPResponsePacketBuilder(this.server, this.addrInfo).addHeader("From", this.getHeaderValue("From")).addHeader("To", this.getHeaderValue("To"))
            .addHeader("Via", via.toString()).addHeader("CSeq", this.getHeaderValue("CSeq")).addHeader("Call-Id", this.getHeaderValue("Call-Id"));
    }

}

class SIPResponsePacket extends SIPPacket {

    public statusCode: number = 0;
    public statusText: string = "";

    public constructor(str: string, server: SIPServer, addrInfo: RemoteInfo) {
        super(str, server, addrInfo);
        this.type = SIPPacketType.Response;
        this.parseRequestLine();
    }

    private parseRequestLine() {
        //let stringMethod = this.str.substring(0, this.str.indexOf(" "));
        let tempstr = this.str.replace('SIP/2.0 ', '');


        this.statusCode = parseInt(tempstr.substring(0, tempstr.indexOf(' ')));
        this.statusText = tempstr.substring(tempstr.indexOf(' ') + 1, tempstr.indexOf('\r\n'));
    }
}

export { SIPPacket, SIPRequestPacket, SIPResponsePacket, SIPHeader, SIPMethodType, SIPPacketType }
