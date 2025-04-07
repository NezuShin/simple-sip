"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIPServer = void 0;
const dgram_1 = require("dgram");
const events_1 = require("events");
const sip_packet_builder_1 = require("./sip-packet-builder");
const sip_packet_1 = require("./sip-packet");
class SIPServer extends events_1.EventEmitter {
    server;
    currentCSeq = 1;
    bindAddres;
    constructor() {
        super();
        this.server = (0, dgram_1.createSocket)('udp4');
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
        let packet = sip_packet_1.SIPPacket.decode(msg, this, addrInfo);
        if (packet.type == sip_packet_1.SIPPacketType.Request) {
            this.emit('request', packet);
        }
        else if (packet.type == sip_packet_1.SIPPacketType.Response) {
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
        return new sip_packet_builder_1.SIPRequestPacketBuilder(this, { address, port }, additional);
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
exports.SIPServer = SIPServer;
//# sourceMappingURL=sip-server.js.map