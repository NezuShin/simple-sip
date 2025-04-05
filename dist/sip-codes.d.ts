interface SIPCode {
    code: number;
    name: string;
    desc: string;
}
declare class SIPCodes {
    static readonly codes: SIPCode[];
    static getCodeName(code: number): string | null;
}
export { SIPCode, SIPCodes };
//# sourceMappingURL=sip-codes.d.ts.map