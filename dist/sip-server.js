import { createSocket } from 'dgram';
import { EventEmitter } from 'events';
import { SIPRequestPacketBuilder } from './sip-packet-builder';
import { SIPPacket, SIPPacketType } from './sip-packet';
class SIPServer extends EventEmitter {
    server;
    currentCSeq = 1;
    bindAddres;
    constructor() {
        super();
        this.server = createSocket('udp4');
        this.server.on('message', this.onMessage.bind(this));
        this.server.on('error', this.onError.bind(this));
        this.server.on('listening', this.onServerListening.bind(this));
    }
    bind(port, address) {
        address = address || "0.0.0.0";
        this.bindAddres = { port, address };
        return new Promise((resolve, reject) => {
            this.server.bind(port, address || "0.0.0.0", () => {
                resolve();
            });
        });
    }
    onMessage(data, addrInfo) {
        let msg = data.toString('utf8');
        if (!msg.trim().replaceAll("\r", "").replaceAll("\n", "").length)
            return;
        let packet = SIPPacket.decode(msg, this, addrInfo);
        if (packet.type == SIPPacketType.Request) {
            this.emit('request', packet);
        }
        else if (packet.type == SIPPacketType.Response) {
            this.emit('response', packet);
        }
    }
    sendPacket(data, addrInfo) {
        return new Promise((resolve, reject) => {
            this.server.send(data, addrInfo.port, addrInfo.address, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    nextCSeq() {
        return this.currentCSeq++;
    }
    onError(err) {
        this.emit('error', err);
    }
    createRequest(address, port, additional) {
        return new SIPRequestPacketBuilder(this, { address, port }, additional);
    }
    getLocalAddress() {
        return this.bindAddres.address;
    }
    close() {
        return new Promise((resolve, reject) => {
            this.server.close(() => {
                resolve();
            });
        });
    }
    onServerListening() {
        let address = this.server.address();
        let port = address.port;
        let family = address.family;
        let ipaddr = address.address;
        console.log(`SIP server is listening at ${ipaddr}:${port}`);
    }
}
export { SIPServer, };
//# sourceMappingURL=sip-server.js.map