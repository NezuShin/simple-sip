var SIPPacketType;
(function (SIPPacketType) {
    SIPPacketType["Request"] = "request";
    SIPPacketType["Response"] = "response";
})(SIPPacketType || (SIPPacketType = {}));
var SIPMethodType;
(function (SIPMethodType) {
    SIPMethodType["INVITE"] = "INVITE";
    SIPMethodType["ACK"] = "ACK";
    SIPMethodType["BYE"] = "BYE";
    SIPMethodType["CANCEL"] = "CANCEL";
    SIPMethodType["REGISTER"] = "REGISTER";
    SIPMethodType["OPTIONS"] = "OPTIONS";
    SIPMethodType["PRACK"] = "PRACK";
    SIPMethodType["SUBSCRIBE"] = "SUBSCRIBE";
    SIPMethodType["NOTIFY"] = "NOTIFY";
    SIPMethodType["PUBLISH"] = "PUBLISH";
    SIPMethodType["INFO"] = "INFO";
    SIPMethodType["REFER"] = "REFER";
    SIPMethodType["MESSAGE"] = "MESSAGE";
    SIPMethodType["UPDATE"] = "UPDATE";
})(SIPMethodType || (SIPMethodType = {}));
class HeaderNotFoundError extends Error {
}
export { SIPPacketType, SIPMethodType, HeaderNotFoundError };
//# sourceMappingURL=sip-packet-helper.js.map