"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeaderNotFoundError = exports.SIPMethodType = exports.SIPPacketType = void 0;
var SIPPacketType;
(function (SIPPacketType) {
    SIPPacketType["Request"] = "request";
    SIPPacketType["Response"] = "response";
})(SIPPacketType || (exports.SIPPacketType = SIPPacketType = {}));
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
})(SIPMethodType || (exports.SIPMethodType = SIPMethodType = {}));
class HeaderNotFoundError extends Error {
}
exports.HeaderNotFoundError = HeaderNotFoundError;
//# sourceMappingURL=sip-packet-helper.js.map