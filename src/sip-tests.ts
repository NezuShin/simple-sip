import { RemoteInfo } from "dgram";
import { SIPMethodType, SIPRequestPacket, SIPResponsePacket } from "./sip-packet";
import { SIPServer } from "./sip-server";
import { SIPResponseSession, SIPSessionHandler } from "./sip-session-handler";


let server = new SIPServer();

server.bind(1337, "127.0.0.1");

let handler = new SIPSessionHandler(server, {});


handler.on("response-session", (session: SIPResponseSession) => {
    let addrInfo: RemoteInfo;
    session.on("request", (packet: SIPRequestPacket) => {
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
