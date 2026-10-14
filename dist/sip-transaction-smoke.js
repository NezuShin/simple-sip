"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Lightweight smoke checks for the RFC 3261 transaction layer.
 * Run: npx ts-node is unavailable; use `npx tsc && node dist/sip-transaction-smoke.js`
 */
const sip_server_1 = require("./sip-server");
const sip_packet_helper_1 = require("./sip-packet-helper");
const sip_packet_1 = require("./sip-packet");
function assert(cond, msg) {
    if (!cond)
        throw new Error(`ASSERT: ${msg}`);
}
async function sleep(ms) {
    await new Promise(r => setTimeout(r, ms));
}
async function testNonInviteClientRetransmit() {
    const server = new sip_server_1.SIPServer({
        transaction: { timerT1: 50, timerT2: 200, timerT4: 100, timerD: 200, enabled: true },
    });
    await server.bind(0, "127.0.0.1");
    const sent = [];
    const orig = server.sendPacket.bind(server);
    server.sendPacket = async (data, addr) => {
        sent.push(Buffer.from(data));
        // Avoid real UDP for the peer — still need bind to exist
        return orig(data, addr).catch(() => undefined);
    };
    const tx = server.createRequest("127.0.0.1", 9)
        .setMethod(sip_packet_helper_1.SIPMethodType.OPTIONS)
        .setRequestURI("sip:127.0.0.1")
        .addHeader("From", "<sip:a@test>;tag=t1")
        .addHeader("To", "<sip:b@test>")
        .addHeader("Call-Id", "smoke-options-1")
        .sendTransaction();
    await sleep(180);
    tx.terminate();
    await server.close();
    assert(sent.length >= 2, `OPTIONS should retransmit (got ${sent.length} sends)`);
    console.log("OK non-invite client retransmit:", sent.length, "sends");
}
async function testInviteServerAbsorb() {
    const server = new sip_server_1.SIPServer({
        transaction: { timerT1: 50, timerT2: 200, timerT4: 100, timerD: 200, enabled: true },
    });
    await server.bind(0, "127.0.0.1");
    let newRequests = 0;
    server.transactions.on("new-request", () => { newRequests++; });
    const branch = "z9hG4bK-smoke-invite";
    const invite = [
        "INVITE sip:b@test SIP/2.0",
        `Via: SIP/2.0/UDP 127.0.0.1:5060;branch=${branch}`,
        "From: <sip:a@test>;tag=from1",
        "To: <sip:b@test>",
        "Call-Id: smoke-invite-1",
        "CSeq: 1 INVITE",
        "Content-Length: 0",
        "",
        "",
    ].join("\r\n");
    const addr = { address: "127.0.0.1", port: 5060, family: "IPv4", size: 0 };
    const p1 = sip_packet_1.SIPPacket.decode(invite, server, addr);
    server.emit("request", p1);
    const p2 = sip_packet_1.SIPPacket.decode(invite, server, addr);
    server.emit("request", p2);
    await sleep(20);
    await server.close();
    assert(newRequests === 1, `INVITE retransmit should be absorbed (new-request=${newRequests})`);
    console.log("OK invite server absorb: new-request count", newRequests);
}
async function testInviteClientNon2xxAck() {
    const server = new sip_server_1.SIPServer({
        transaction: { timerT1: 500, timerT2: 4000, timerT4: 100, timerD: 150, enabled: true },
    });
    await server.bind(0, "127.0.0.1");
    const sent = [];
    server.sendPacket = async (data) => {
        sent.push(data.toString("utf8"));
    };
    const tx = server.createRequest("127.0.0.1", 9)
        .setMethod(sip_packet_helper_1.SIPMethodType.INVITE)
        .setRequestURI("sip:b@test")
        .addHeader("From", "<sip:a@test>;tag=t1")
        .addHeader("To", "<sip:b@test>")
        .addHeader("Call-Id", "smoke-invite-ack")
        .sendTransaction();
    await sleep(20);
    const via = sent[0].match(/^Via: (.+)$/m)?.[1] || "";
    const cseq = sent[0].match(/^CSeq: (.+)$/m)?.[1] || "1 INVITE";
    const response = [
        "SIP/2.0 486 Busy Here",
        `Via: ${via}`,
        "From: <sip:a@test>;tag=t1",
        "To: <sip:b@test>;tag=totag",
        "Call-Id: smoke-invite-ack",
        `CSeq: ${cseq}`,
        "Content-Length: 0",
        "",
        "",
    ].join("\r\n");
    const addr = { address: "127.0.0.1", port: 9, family: "IPv4", size: 0 };
    server.emit("response", sip_packet_1.SIPPacket.decode(response, server, addr));
    await sleep(30);
    tx.terminate();
    await server.close();
    const ack = sent.find(s => s.startsWith("ACK "));
    assert(!!ack, "non-2xx INVITE should auto-send ACK");
    console.log("OK invite client non-2xx ACK");
}
async function main() {
    await testNonInviteClientRetransmit();
    await testInviteServerAbsorb();
    await testInviteClientNon2xxAck();
    console.log("All smoke checks passed.");
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=sip-transaction-smoke.js.map