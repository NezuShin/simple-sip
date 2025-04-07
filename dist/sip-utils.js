"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FromToParam = exports.ViaTransport = exports.ViaParam = void 0;
exports.parseAuthorization = parseAuthorization;
//deprecated. Need noraml version
function parseAuthorization(string) {
    if (!string)
        return undefined;
    //Digest username="111",realm="asterisk",nonce="641e92e4",uri="sip:nezushin.ru:5000",algorithm=MD5,response="hash"'
    let authSplit = string.substring(string.indexOf(" ") + 1, string.length).split(",");
    let parms = {};
    for (let i = 0; i < authSplit.length; i++) {
        let str = authSplit[i]?.trim();
        if (str.includes("=")) {
            let strKey = str.substring(0, str.indexOf("="));
            let strValue = str.substring(str.indexOf("=") + 1, str.length);
            parms[strKey] = strValue.replaceAll("\"", "");
        }
    }
    return parms;
}
// To: <sip:bob;rn=bob2%26@example.com;xyz=123%26>;xyz=456
// xyz=123 - uri param (percent encoding / decodeURIComponent)
// xyz=456 - address param (quoted string / normal=123;wierd="123123\"")
// rn=bob2 - user param (percent encoding / decodeURIComponent)
var ViaTransport;
(function (ViaTransport) {
    ViaTransport["UDP"] = "UDP";
    ViaTransport["TCP"] = "TCP";
})(ViaTransport || (exports.ViaTransport = ViaTransport = {}));
function parseAddressParams(paramsStr, map) {
    let paramName = "";
    let nameFilled = false;
    let paramValue = "";
    function commit() {
        if (paramName.length) {
            paramValue = paramValue.startsWith("\"") && paramValue.endsWith("\"") ? paramValue.substring(1, paramValue.length - 1).replaceAll("\\\"", "\"") : paramValue;
            map.set(paramName, paramValue);
        }
        paramName = "";
        paramValue = "";
        nameFilled = false;
    }
    for (let i of paramsStr) {
        if (i == ";") {
            commit();
        }
        else if (i == "=") {
            nameFilled = true;
        }
        else {
            if (nameFilled) {
                paramValue += i;
            }
            else {
                paramName += i;
            }
        }
    }
    commit();
}
function prepareAddressParams(params) {
    return `${[...params.entries()].map(i => `;${i[0]}${i[1].length ? "=" : ""}${i[1].includes("\"") ? `"${i[1].replaceAll('\"', '\\\"')}"` : i[1]}`).join("")}`;
}
class ViaParam {
    static create(data) {
        let via = new ViaParam();
        let params = data.params || {};
        for (let i of Object.keys(params)) {
            via.params.set(i, `${params[i]}`);
        }
        via.transport = data.transport || ViaTransport.UDP;
        via.address = data.address;
        via.port = data.port;
        return via;
    }
    transport = ViaTransport.UDP;
    params = new Map();
    address = "";
    port = 0;
    constructor(str) {
        if (!str || !str.length)
            return;
        this.transport = str.substring(str.indexOf("2.0/") + "2.0/".length, str.indexOf(" "));
        let index = str.indexOf(";");
        let s = str.substring(str.indexOf(" ") + 1, index == -1 ? str.length : index);
        if (s.includes(":")) {
            let split = s.split(":");
            this.address = split[0];
            this.port = parseInt(split[1]);
        }
        else {
            this.address = s;
        }
        if (index != -1) {
            parseAddressParams(str.substring(index, str.length), this.params);
        }
    }
    toString() {
        return `SIP/2.0/${this.transport} ${this.address}:${this.port}${prepareAddressParams(this.params)}`;
    }
}
exports.ViaParam = ViaParam;
class FromToParam {
    static create(data) {
        let params = new FromToParam();
        let addressParams = data.addressParams || {};
        for (let i of Object.keys(addressParams)) {
            params.addressParams.set(i, `${addressParams[i]}`);
        }
        let uriParams = data.uriParams || {};
        for (let i of Object.keys(uriParams)) {
            params.uriParams.set(i, `${uriParams[i]}`);
        }
        let userParams = data.userParams || {};
        for (let i of Object.keys(userParams)) {
            params.userParams.set(i, `${userParams[i]}`);
        }
        params.displayname = data.displayname || "";
        params.username = data.username || "";
        params.domain = data.domain;
        return params;
    }
    addressParams = new Map();
    uriParams = new Map();
    userParams = new Map();
    displayname = "";
    username = "";
    domain = "";
    constructor(str) {
        if (!str || !str.length)
            return;
        // To: <sip:bob;rn=bob2%26@example.com;xyz=123%26>;xyz=456
        // xyz=123 - uri param (percent encoding / decodeURIComponent)
        // xyz=456 - address param (quoted string / normal=123;wierd="123123\"")
        // rn=bob2 - user param (percent encoding / decodeURIComponent)
        let data = /^\s*(?<displayname>.*)?\s*<(?:(?<protocol>sip):)?(?<username>[^;<>]+)(?:;(?<userParams>[^<>]+))?@(?<domain>[^;<>]+)(?:;(?<uriParams>[^<>]+))?>(?:;(?<addressParams>[^<>]+))?$/gm
            .exec(str);
        if (!data || !data.groups)
            return;
        this.displayname = data?.groups.displayname;
        this.displayname = this.displayname.startsWith("\"") && this.displayname.endsWith("\"") ? this.displayname.substring(1, this.displayname.length - 1).replace("\\\"", "\"") : this.displayname;
        this.username = data.groups.username;
        this.domain = data.groups.domain;
        this.parseParams(data.groups.userParams, this.userParams);
        this.parseParams(data.groups.uriParams, this.uriParams);
        parseAddressParams(data.groups.addressParams, this.addressParams);
    }
    parseParams(paramsStr, map) {
        let paramName = "";
        let nameFilled = false;
        let paramValue = "";
        function commit() {
            if (paramName.length && paramValue.length)
                map.set(paramName, decodeURIComponent(paramValue));
            paramName = "";
            paramValue = "";
            nameFilled = false;
        }
        for (let i of paramsStr) {
            if (i == ";") {
                commit();
            }
            else if (i == "=") {
                nameFilled = true;
            }
            else {
                if (nameFilled) {
                    paramValue += i;
                }
                else {
                    paramName += i;
                }
            }
        }
        commit();
    }
    prepareURIParams(params) {
        return `${[...params.entries()].map(i => `;${i[0] + (i[1] && i[1]?.length ? ("=" + encodeURIComponent(i[1])) : '')}`).join("")}`;
    }
    toRequestURI() {
        let str = `sip:${this.username && this.username.length ? this.username : ""}${this.prepareURIParams(this.userParams)}${this.username && this.username.length ? "@" : ""}${this.domain}${this.prepareURIParams(this.uriParams)}`;
        return str;
    }
    toString() {
        let str = `<sip:${this.username}${this.prepareURIParams(this.userParams)}${this.username && this.username.length ? "@" : ""}${this.domain}${this.prepareURIParams(this.uriParams)}>${prepareAddressParams(this.addressParams)}`;
        if (this.displayname && this.displayname.length) {
            let dn;
            if (this.displayname.includes("\"")) {
                dn = `"${this.displayname.replaceAll("\"", "\\\"")}" `;
            }
            else {
                this.displayname + " ";
            }
            str = dn + str;
        }
        return str;
    }
    clone() {
        let result = new FromToParam();
        result.addressParams = new Map(this.addressParams);
        result.uriParams = new Map(this.uriParams);
        result.userParams = new Map(this.userParams);
        result.displayname = this.displayname;
        result.username = this.username;
        result.domain = this.domain;
        return result;
    }
}
exports.FromToParam = FromToParam;
//console.log(new FromToParam("\"Bob \\\"\" <sip:example.com;xyz=123;wierd=%26>;xyz=456;wierd=\"123\\\"\"").toString());
/*console.log(FromToParam.create({
    username: "bob",
    domain: "example.com",
    displayname: "\"Bob4ik\"",
    addressParams: {
        "tag": "0x000000b"
    }
}).toString())*/
function parseFromTo(str) {
}
//# sourceMappingURL=sip-utils.js.map