import { SIPResponsePacketBuilder } from './sip-packet-builder';
import { SIPPacketType, SIPMethodType, HeaderNotFoundError } from './sip-packet-helper';
import { ViaParam } from './sip-utils';
class SIPPacket {
    str = '';
    server;
    addrInfo;
    body;
    headers = [];
    type = SIPPacketType.Request;
    constructor(str, server, addrInfo) {
        this.str = str;
        this.server = server;
        this.addrInfo = addrInfo;
        this.parseHeaders();
        this.parseBody();
    }
    getHeader(name) {
        for (let i of this.headers) {
            if (i.name.toUpperCase() == name.toUpperCase())
                return i.value;
        }
        return null;
    }
    hashCode() {
        let hash = 0, i, chr;
        if (this.str.length === 0)
            return hash;
        for (i = 0; i < this.str.length; i++) {
            chr = this.str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
    getHeaderValue(name) {
        for (let i of this.headers) {
            if (i.name.toUpperCase() == name.toUpperCase())
                return i.value;
        }
        throw new HeaderNotFoundError(`Could not found header ${name}`);
    }
    parseBody() {
        let div = "\r\n\r\n";
        this.body = this.str.substring(this.str.indexOf(div) + div.length, this.str.length);
    }
    parseHeaders() {
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
    static decode(str, server, addrInfo) {
        if (str.toLowerCase().startsWith('sip')) {
            return new SIPResponsePacket(str, server, addrInfo);
        }
        return new SIPRequestPacket(str, server, addrInfo);
    }
}
class SIPRequestPacket extends SIPPacket {
    method = SIPMethodType.INFO;
    constructor(str, server, addrInfo) {
        super(str, server, addrInfo);
        this.type = SIPPacketType.Request;
        this.parseRequestLine();
    }
    parseRequestLine() {
        let stringMethod = this.str.substring(0, this.str.indexOf(" "));
        this.method = stringMethod;
    }
    createResponse() {
        let via = new ViaParam(this.getHeaderValue("Via"));
        if (via.params.has("rport")) {
            if (via.params.get("rport") == "") {
                via.params.set("rport", `${this.addrInfo.port}`);
                via.params.set("received", `${this.addrInfo.address}`);
            }
            ;
        }
        return new SIPResponsePacketBuilder(this.server, this.addrInfo).addHeader("From", this.getHeaderValue("From")).addHeader("To", this.getHeaderValue("To"))
            .addHeader("Via", via.toString()).addHeader("CSeq", this.getHeaderValue("CSeq")).addHeader("Call-Id", this.getHeaderValue("Call-Id"));
    }
}
class SIPResponsePacket extends SIPPacket {
    statusCode = 0;
    statusText = "";
    constructor(str, server, addrInfo) {
        super(str, server, addrInfo);
        this.type = SIPPacketType.Response;
        this.parseRequestLine();
    }
    parseRequestLine() {
        //let stringMethod = this.str.substring(0, this.str.indexOf(" "));
        let tempstr = this.str.replace('SIP/2.0 ', '');
        this.statusCode = parseInt(tempstr.substring(0, tempstr.indexOf(' ')));
        this.statusText = tempstr.substring(tempstr.indexOf(' ') + 1, tempstr.indexOf('\r\n'));
    }
}
export { SIPPacket, SIPRequestPacket, SIPResponsePacket, SIPMethodType, SIPPacketType };
//# sourceMappingURL=sip-packet.js.map