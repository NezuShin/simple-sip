import { RemoteInfo } from 'dgram';
import { SIPResponsePacketBuilder } from './sip-packet-builder';
import { SIPPacketType, SIPMethodType, SIPHeader } from './sip-packet-helper';
import { SIPServer } from './sip-server';
declare abstract class SIPPacket {
    protected str: string;
    protected server: SIPServer;
    addrInfo: RemoteInfo;
    body: string;
    headers: SIPHeader[];
    type: SIPPacketType;
    constructor(str: string, server: SIPServer, addrInfo: RemoteInfo);
    getHeader(name: string): string | null;
    hashCode(): number;
    getHeaderValue(name: string): string;
    private parseBody;
    private parseHeaders;
    static decode(str: string, server: SIPServer, addrInfo: RemoteInfo): SIPRequestPacket | SIPResponsePacket;
}
declare class SIPRequestPacket extends SIPPacket {
    method: SIPMethodType;
    constructor(str: string, server: SIPServer, addrInfo: RemoteInfo);
    private parseRequestLine;
    createResponse(): SIPResponsePacketBuilder;
}
declare class SIPResponsePacket extends SIPPacket {
    statusCode: number;
    statusText: string;
    constructor(str: string, server: SIPServer, addrInfo: RemoteInfo);
    private parseRequestLine;
}
export { SIPPacket, SIPRequestPacket, SIPResponsePacket, SIPHeader, SIPMethodType, SIPPacketType };
//# sourceMappingURL=sip-packet.d.ts.map