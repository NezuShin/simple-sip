enum SIPPacketType {
    Request = 'request',
    Response = 'response'
}


enum SIPMethodType {
    INVITE = 'INVITE',
    ACK = 'ACK',
    BYE = 'BYE',
    CANCEL = 'CANCEL',
    REGISTER = 'REGISTER',
    OPTIONS = 'OPTIONS',
    PRACK = 'PRACK',
    SUBSCRIBE = 'SUBSCRIBE',
    NOTIFY = 'NOTIFY',
    PUBLISH = 'PUBLISH',
    INFO = 'INFO',
    REFER = 'REFER',
    MESSAGE = 'MESSAGE',
    UPDATE = 'UPDATE'
}

interface SIPHeader {
    name: string;
    value: string;
}

class HeaderNotFoundError extends Error {

}

export {SIPPacketType, SIPMethodType, SIPHeader, HeaderNotFoundError }