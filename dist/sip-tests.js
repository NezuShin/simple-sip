"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sip_server_1 = require("./sip-server");
const sip_session_handler_1 = require("./sip-session-handler");
let server = new sip_server_1.SIPServer();
server.bind(1337, "127.0.0.1");
let handler = new sip_session_handler_1.SIPSessionHandler(server, {});
handler.on("response-session", (session) => {
    let addrInfo;
    session.on("request", (packet) => {
        addrInfo = packet.addrInfo;
        packet.createResponse().setStatusCode(200).send();
        /*setTimeout(() => {
            let domain = session.from.domain;
            let reqs = handler.createRequestSession({
                called: { number: session.from.username, domain },
                caller: { number: "1337", domain }
            });
            reqs.on('response', (rpacket: SIPResponsePacket) => {
                
            });
            reqs.createRequest(addrInfo.address, addrInfo.port)
            .setMethod(SIPMethodType.INVITE).send();

        }, 1000);*/
    });
});
//# sourceMappingURL=sip-tests.js.map