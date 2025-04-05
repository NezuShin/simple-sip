
//deprecated. Need noraml version
function parseAuthorization(string: string): { algorithm: string, realm: string, nonce: string } | undefined {
    if (!string)
        return undefined;
    //Digest username="111",realm="asterisk",nonce="641e92e4",uri="sip:nezushin.ru:5000",algorithm=MD5,response="hash"'


    let authSplit = string.substring(string.indexOf(" ") + 1, string.length).split(",");

    let parms: { [key: string]: string } = {};

    for (let i = 0; i < authSplit.length; i++) {
        let str = authSplit[i]?.trim();

        if (str.includes("=")) {

            let strKey = str.substring(0, str.indexOf("="));
            let strValue = str.substring(str.indexOf("=") + 1, str.length);

            parms[strKey] = strValue.replaceAll("\"", "");
        }
    }

    return parms as { algorithm: string, realm: string, nonce: string };
}


// To: <sip:bob;rn=bob2%26@example.com;xyz=123%26>;xyz=456
// xyz=123 - uri param (percent encoding / decodeURIComponent)
// xyz=456 - address param (quoted string / normal=123;wierd="123123\"")
// rn=bob2 - user param (percent encoding / decodeURIComponent)

enum ViaTransport {
    UDP = 'UDP',
    TCP = 'TCP'
}

function parseAddressParams(paramsStr: string, map: Map<string, string>) {
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
        } else if (i == "=") {
            nameFilled = true;
        } else {
            if (nameFilled) {
                paramValue += i;
            } else {
                paramName += i;
            }
        }
    }
    commit();
}

function prepareAddressParams(params: Map<string, string>) {
    return `${[...params.entries()].map(i => `;${i[0]}${i[1].length ? "=" : ""}${i[1].includes("\"") ? `"${i[1].replaceAll('\"', '\\\"')}"` : i[1]}`).join("")}`;
}


class ViaParam {

    static create(data: ViaParamDataCreate) {
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

    public transport: ViaTransport = ViaTransport.UDP;
    public params: Map<string, string> = new Map();
    public address: string = "";
    public port: number = 0;
    constructor(str?: string) {
        if (!str || !str.length)
            return;

        this.transport = str.substring(str.indexOf("2.0/") + "2.0/".length, str.indexOf(" ")) as ViaTransport;


        let index = str.indexOf(";");
        let s = str.substring(str.indexOf(" ") + 1, index == -1 ? str.length : index);
        if (s.includes(":")) {
            let split = s.split(":");
            this.address = split[0];
            this.port = parseInt(split[1]);
        } else {
            this.address = s;
        }


        if (index != -1) {
            parseAddressParams(str.substring(index, str.length), this.params);
        }
    }

    public toString() {
        return `SIP/2.0/${this.transport} ${this.address}:${this.port}${prepareAddressParams(this.params)}`;
    }

}

//console.log(new ViaParam("SIP/2.0/UDP 192.168.1.54:50539;rport;branch=123123123").toString());

interface ParamData {
    [key: string]: string | number
}

interface ViaParamDataCreate {
    params?: ParamData,
    address: string,
    port: number,
    transport?: ViaTransport
}

interface FromToParamDataCreate {
    addressParams?: ParamData,
    uriParams?: ParamData,
    userParams?: ParamData,
    displayname?: string,
    username: string,
    domain: string
}

class FromToParam {

    static create(data: FromToParamDataCreate) {
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



    public addressParams: Map<string, string> = new Map();
    public uriParams: Map<string, string> = new Map();
    public userParams: Map<string, string> = new Map();
    public displayname: string = "";
    public username: string = "";
    public domain: string = "";

    constructor(str?: string) {
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

        this.displayname = this.displayname.startsWith("\"") && this.displayname.endsWith("\"") ? this.displayname.substring(1, this.displayname.length - 1).replace("\\\"", "\"") : this.displayname

        this.username = data.groups.username;

        this.domain = data.groups.domain;

        this.parseParams(data.groups.userParams, this.userParams);
        this.parseParams(data.groups.uriParams, this.uriParams);
        parseAddressParams(data.groups.addressParams, this.addressParams);
    }

    private parseParams(paramsStr: string, map: Map<string, string | undefined>) {
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
            } else if (i == "=") {
                nameFilled = true;
            } else {
                if (nameFilled) {
                    paramValue += i;
                } else {
                    paramName += i;
                }
            }
        }
        commit();
    }

    private prepareURIParams(params: Map<string, string | undefined>) {
        return `${[...params.entries()].map(i => `;${i[0] + (i[1] && i[1]?.length ? ("=" + encodeURIComponent(i[1])) : '')}`).join("")}`;
    }


    public toRequestURI() {
        let str = `sip:${this.username && this.username.length ? this.username : ""}${this.prepareURIParams(this.userParams)}${this.username && this.username.length ? "@" : ""}${this.domain}${this.prepareURIParams(this.uriParams)}`;

        return str;
    }

    public toString() {
        let str = `<sip:${this.username}${this.prepareURIParams(this.userParams)}${this.username && this.username.length ? "@" : ""}${this.domain}${this.prepareURIParams(this.uriParams)}>${prepareAddressParams(this.addressParams)}`;
        if (this.displayname && this.displayname.length) {
            let dn;
            if (this.displayname.includes("\"")) {
                dn = `"${this.displayname.replaceAll("\"", "\\\"")}" `;
            } else {
                this.displayname + " ";
            }
            str = dn + str;
        }

        return str;
    }


    public clone() {
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

//console.log(new FromToParam("\"Bob \\\"\" <sip:example.com;xyz=123;wierd=%26>;xyz=456;wierd=\"123\\\"\"").toString());
/*console.log(FromToParam.create({
    username: "bob",
    domain: "example.com",
    displayname: "\"Bob4ik\"",
    addressParams: {
        "tag": "0x000000b"
    }
}).toString())*/

function parseFromTo(str: string) {



}

export {
    ViaParam,
    ViaTransport,
    ParamData,
    FromToParamDataCreate,
    ViaParamDataCreate,
    FromToParam,
    parseAuthorization
}