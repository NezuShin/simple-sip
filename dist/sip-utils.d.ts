declare function parseAuthorization(string: string): {
    algorithm: string;
    realm: string;
    nonce: string;
} | undefined;
declare enum ViaTransport {
    UDP = "UDP",
    TCP = "TCP"
}
declare class ViaParam {
    static create(data: ViaParamDataCreate): ViaParam;
    transport: ViaTransport;
    params: Map<string, string>;
    address: string;
    port: number;
    constructor(str?: string);
    toString(): string;
}
interface ParamData {
    [key: string]: string | number;
}
interface ViaParamDataCreate {
    params?: ParamData;
    address: string;
    port: number;
    transport?: ViaTransport;
}
interface FromToParamDataCreate {
    addressParams?: ParamData;
    uriParams?: ParamData;
    userParams?: ParamData;
    displayname?: string;
    username: string;
    domain: string;
}
declare class FromToParam {
    static create(data: FromToParamDataCreate): FromToParam;
    addressParams: Map<string, string>;
    uriParams: Map<string, string>;
    userParams: Map<string, string>;
    displayname: string;
    username: string;
    domain: string;
    constructor(str?: string);
    private parseParams;
    private prepareURIParams;
    toRequestURI(): string;
    toString(): string;
    clone(): FromToParam;
}
export { ViaParam, ViaTransport, ParamData, FromToParamDataCreate, ViaParamDataCreate, FromToParam, parseAuthorization };
//# sourceMappingURL=sip-utils.d.ts.map