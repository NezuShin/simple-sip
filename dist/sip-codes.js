"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIPCodes = void 0;
class SIPCodes {
    static codes = [
        {
            "code": 100,
            "name": "Trying",
            "desc": "Extended search being performed may take a significant time so a forking proxy must send a 100 Trying response."
        },
        {
            "code": 180,
            "name": "Ringing",
            "desc": "Destination user agent received INVITE, and is alerting user of call."
        },
        {
            "code": 181,
            "name": "Call is Being Forwarded",
            "desc": "Servers can optionally send this response to indicate a call is being forwarded."
        },
        {
            "code": 182,
            "name": "Queued",
            "desc": "Indicates that the destination was temporarily unavailable, so the server has queued the call until the destination is available. A server may send multiple 182 responses to update progress of the queue."
        },
        {
            "code": 183,
            "name": "Session in Progress",
            "desc": "This response may be used to send extra information for a call which is still being set up."
        },
        {
            "code": 199,
            "name": "Early Dialog Terminated",
            "desc": "Can be used by User Agent Server to indicate to upstream SIP entities (including the User Agent Client (UAC)) that an early dialog has been terminated."
        },
        {
            "code": 200,
            "name": "OK",
            "desc": "Indicates the request was successful."
        },
        {
            "code": 202,
            "name": "Accepted",
            "desc": "Indicates that the request has been accepted for processing, but the processing has not been completed."
        },
        {
            "code": 204,
            "name": "No Notification",
            "desc": "Indicates the request was successful, but the corresponding response will not be received."
        },
        {
            "code": 300,
            "name": " Multiple Choices",
            "desc": "The address resolved to one of several options for the user or client to choose between, which are listed in the message body or the message's Contact fields."
        },
        {
            "code": 301,
            "name": "Moved Permanently",
            "desc": "The original Request-URI is no longer valid, the new address is given in the Contact header field, and the client should update any records of the original Request-URI with the new value."
        },
        {
            "code": 302,
            "name": "Moved Temporarily",
            "desc": "The client should try at the address in the Contact field. If an Expires field is present, the client may cache the result for that period of time."
        },
        {
            "code": 305,
            "name": "Use Proxy",
            "desc": "The Contact field details a proxy that must be used to access the requested destination."
        },
        {
            "code": 380,
            "name": "Alternative Service",
            "desc": "The call failed, but alternatives are detailed in the message body."
        },
        {
            "code": 400,
            "name": "Bad Request",
            "desc": "The request could not be understood due to malformed syntax."
        },
        {
            "code": 401,
            "name": "Unauthorized",
            "desc": "The request requires user authentication. This response is issued by UASs and registrars."
        },
        {
            "code": 402,
            "name": "Payment Required",
            "desc": "Reserved for future use."
        },
        {
            "code": 403,
            "name": "Forbidden",
            "desc": "The server understood the request, but is refusing to fulfil it."
        },
        {
            "code": 404,
            "name": "Not Found",
            "desc": "The server has definitive information that the user does not exist at the domain specified in the Request-URI. This status is also returned if the domain in the Request-URI does not match any of the domains handled by the recipient of the request."
        },
        {
            "code": 405,
            "name": "Method Not Allowed",
            "desc": "The method specified in the Request-Line is understood, but not allowed for the address identified by the Request-URI."
        },
        {
            "code": 406,
            "name": "Not Acceptable",
            "desc": "The resource identified by the request is only capable of generating response entities that have content characteristics but not acceptable according to the Accept header field sent in the request."
        },
        {
            "code": 407,
            "name": "Proxy Authentication Required",
            "desc": "The request requires user authentication. This response is issued by proxys."
        },
        {
            "code": 408,
            "name": "Request Timeout",
            "desc": "Couldn't find the user in time. The server could not produce a response within a suitable amount of time, for example, if it could not determine the location of the user in time. The client MAY repeat the request without modifications at any later time."
        },
        {
            "code": 409,
            "name": " Conflict",
            "desc": "User already registered."
        },
        {
            "code": 410,
            "name": "Gone",
            "desc": "The user existed once, but is not available here any more."
        },
        {
            "code": 411,
            "name": "Length Required",
            "desc": "The server will not accept the request without a valid Content-Length."
        },
        {
            "code": 412,
            "name": "Conditional Request Failed",
            "desc": "The given precondition has not been met."
        },
        {
            "code": 413,
            "name": "Request Entity Too Large",
            "desc": "Request body too large."
        },
        {
            "code": 414,
            "name": "Request-URI Too Long",
            "desc": "The server is refusing to service the request because the Request-URI is longer than the server is willing to interpret."
        },
        {
            "code": 415,
            "name": "Unsupported Media Type",
            "desc": "Request body in a format not supported."
        },
        {
            "code": 416,
            "name": "Unsupported URI Scheme",
            "desc": "Request-URI is unknown to the server."
        },
        {
            "code": 417,
            "name": "Unknown Resource-Priority",
            "desc": "There was a resource-priority option tag, but no Resource-Priority header."
        },
        {
            "code": 420,
            "name": "Bad Extension",
            "desc": "Bad SIP Protocol Extension used, not understood by the server."
        },
        {
            "code": 421,
            "name": "Extension Required",
            "desc": "The server needs a specific extension not listed in the Supported header."
        },
        {
            "code": 422,
            "name": "Session Interval Too Small",
            "desc": "The received request contains a Session-Expires header field with a duration below the minimum timer."
        },
        {
            "code": 423,
            "name": "Interval Too Brief",
            "desc": "Expiration time of the resource is too short."
        },
        {
            "code": 424,
            "name": "Bad Location Information",
            "desc": "The request's location content was malformed or otherwise unsatisfactory."
        },
        {
            "code": 428,
            "name": "Use Identity Header",
            "desc": "The server policy requires an Identity header, and one has not been provided."
        },
        {
            "code": 429,
            "name": "Provide Referrer Identity",
            "desc": "The server did not receive a valid Referred-By token on the request."
        },
        {
            "code": 430,
            "name": "Flow Failed",
            "desc": "A specific flow to a user agent has failed, although other flows may succeed. This response is intended for use between proxy devices, and should not be seen by an endpoint (and if it is seen by one, should be treated as a 400 Bad Request response)."
        },
        {
            "code": 433,
            "name": "Anonymity Disallowed",
            "desc": "The request has been rejected because it was anonymous."
        },
        {
            "code": 436,
            "name": "Bad Identity-Info",
            "desc": "The request has an Identity-Info header, and the URI scheme in that header cannot be dereferenced."
        },
        {
            "code": 437,
            "name": "Unsupported Certificate",
            "desc": "The server was unable to validate a certificate for the domain that signed the request."
        },
        {
            "code": 438,
            "name": "Invalid Identity Header",
            "desc": "The server obtained a valid certificate that the request claimed was used to sign the request, but was unable to verify that signature."
        },
        {
            "code": 439,
            "name": "First Hop Lacks Outbound Support",
            "desc": "The first outbound proxy the user is attempting to register through does not support the 'outbound' feature of RFC 5626, although the registrar does."
        },
        {
            "code": 470,
            "name": "Consent Needed",
            "desc": "The source of the request did not have the permission of the recipient to make such a request."
        },
        {
            "code": 480,
            "name": "Temporarily Unavailable",
            "desc": "Callee currently unavailable."
        },
        {
            "code": 481,
            "name": "Call/Transaction Does Not Exist",
            "desc": "Server received a request that does not match any dialog or transaction."
        },
        {
            "code": 482,
            "name": "Loop Detected",
            "desc": "Server has detected a loop."
        },
        {
            "code": 483,
            "name": "Too Many Hops",
            "desc": "Max-Forwards header has reached the value 0."
        },
        {
            "code": 484,
            "name": "Address Incomplete",
            "desc": "Request-URI incomplete."
        },
        {
            "code": 485,
            "name": "Ambiguous",
            "desc": "Request-URI is ambiguous."
        },
        {
            "code": 486,
            "name": "Busy Here",
            "desc": "Callee is busy."
        },
        {
            "code": 487,
            "name": "Request Terminated",
            "desc": "Request has terminated by bye or cancel."
        },
        {
            "code": 488,
            "name": "Not Acceptable Here",
            "desc": "Some aspect of the session description or the Request-URI is not acceptable."
        },
        {
            "code": 489,
            "name": "Bad Event",
            "desc": "The server did not understand an event package specified in an Event header field."
        },
        {
            "code": 491,
            "name": "Request Pending",
            "desc": "Server has some pending request from the same dialog."
        },
        {
            "code": 493,
            "name": "Undecipherable",
            "desc": "Request contains an encrypted MIME body, which recipient can not decrypt."
        },
        {
            "code": 494,
            "name": "Security Agreement Required",
            "desc": "The server has received a request that requires a negotiated security mechanism, and the response contains a list of suitable security mechanisms for the requester to choose between."
        },
        {
            "code": 500,
            "name": "Server Internal Error",
            "desc": "The server could not fulfill the request due to some unexpected condition."
        },
        {
            "code": 501,
            "name": "Not Implemented",
            "desc": "The server does not have the ability to fulfill the request, such as because it does not recognize the request method. (Compare with 405 Method Not Allowed, where the server recognizes the method but does not allow or support it.)"
        },
        {
            "code": 502,
            "name": "Bad Gateway",
            "desc": "The server is acting as a gateway or proxy, and received an invalid response from a downstream server while attempting to fulfill the request."
        },
        {
            "code": 503,
            "name": "Service Unavailable",
            "desc": "The server is undergoing maintenance or is temporarily overloaded and so cannot process the request. A 'Retry-After' header field may specify when the client may reattempt its request."
        },
        {
            "code": 504,
            "name": "Server Time-out",
            "desc": "The server attempted to access another server in attempting to process the request, and did not receive a prompt response."
        },
        {
            "code": 505,
            "name": "Version Not Supported",
            "desc": "The SIP protocol version in the request is not supported by the server."
        },
        {
            "code": 513,
            "name": "Message Too Large",
            "desc": "The request message length is longer than the server can process."
        },
        {
            "code": 580,
            "name": "Precondition Failure",
            "desc": "The server is unable or unwilling to meet some constraints specified in the offer."
        },
        {
            "code": 600,
            "name": "Busy Everywhere",
            "desc": "All possible destinations are busy. Unlike the 486 response, this response indicates the destination knows there are no alternative destinations (such as a voicemail server) able to accept the call."
        },
        {
            "code": 603,
            "name": "Decline",
            "desc": "The destination does not wish to participate in the call, or cannot do so, and additionally the destination knows there are no alternative destinations (such as a voicemail server) willing to accept the call."
        },
        {
            "code": 604,
            "name": "Does Not Exist Anywhere",
            "desc": "The server has authoritative information that the requested user does not exist anywhere."
        },
        {
            "code": 606,
            "name": "Not Acceptable",
            "desc": "The user's agent was contacted successfully but some aspects of the session description such as the requested media, bandwidth, or addressing style were not acceptable."
        }
    ];
    static getCodeName(code) {
        for (let i of this.codes) {
            if (i.code == code)
                return i.name;
        }
        return null;
    }
}
exports.SIPCodes = SIPCodes;
//# sourceMappingURL=sip-codes.js.map