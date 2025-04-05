import { RemoteInfo, Socket, createSocket } from 'dgram';
import { EventEmitter } from 'events';


import { SIPResponsePacketBuilder, SIPRequestPacketBuilder, SIPRequestPacketBuilderAdditional } from './sip-packet-builder';
import { SIPPacket, SIPRequestPacket, SIPResponsePacket, SIPHeader, SIPMethodType, SIPPacketType } from './sip-packet';
import { FromToParam } from './sip-utils';
import { randomUUID } from 'crypto';

interface AddrInfo {
    address: string,
    port: number
}

class SIPServer extends EventEmitter {

    private server: Socket;
    private currentCSeq: number = 1;
    public bindAddres?: AddrInfo;

    public constructor() {
        super();


        this.server = createSocket('udp4');
        this.server.on('message', this.onMessage.bind(this));
        this.server.on('error', this.onError.bind(this));
        this.server.on('listening', this.onServerListening.bind(this));
    }

    public bind(port: number, address?: string | undefined | null) {
        address = address || "0.0.0.0";
        this.bindAddres = { port, address };
        return new Promise<void>((resolve, reject) => {
            this.server.bind(port, address || "0.0.0.0", () => {
                resolve();
            });
        });
    }

    private onMessage(data: Buffer, addrInfo: RemoteInfo) {
        let msg = data.toString('utf8');
        if (!msg.trim().replaceAll("\r", "").replaceAll("\n", "").length)
            return;

        let packet = SIPPacket.decode(msg, this, addrInfo);
        if (packet.type == SIPPacketType.Request) {
            this.emit('request', packet);
        } else if (packet.type == SIPPacketType.Response) {
            this.emit('response', packet);

        }
    }

    public sendPacket(data: Buffer, addrInfo: AddrInfo) {
        return new Promise<void>((resolve, reject) => {
            this.server.send(data, addrInfo.port, addrInfo.address, (err: Error | null) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    public nextCSeq() {
        return this.currentCSeq++;
    }

    private onError(err: any) {
        this.emit('error', err);
    }

    public createRequest(address: string, port: number, additional?: SIPRequestPacketBuilderAdditional): SIPRequestPacketBuilder {
        return new SIPRequestPacketBuilder(this, { address, port }, additional);
    }

    public getLocalAddress(): string {
        return (this.bindAddres as AddrInfo).address;
    }

    public close() {
        return new Promise<void>((resolve, reject) => {
            this.server.close(() => {
                resolve();
            });
        });
    }

    private onServerListening() {
        let address = this.server.address();
        let port = address.port;
        let family = address.family;
        let ipaddr = address.address;
        console.log(`SIP server is listening at ${ipaddr}:${port}`);
    }
}




export {
    SIPServer,
    AddrInfo,
}