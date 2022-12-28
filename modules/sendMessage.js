let messagesTypes = {
    socks5: {
        NOT_FOUND: Buffer.from([0x05, 0x04, 0x00, 0x00, 0x00]),
        SERVER_DOWN: Buffer.from([0x05, 0x05, 0x00, 0x00, 0x00]),
        OK: Buffer.from([0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),

        CONTINUE_AUTH: Buffer.from([0x05, 0x02]),
        CONTINUE_NO_AUTH: Buffer.from([0x05, 0x00]),

        FAILED_NO_AUTH: Buffer.from([0x01, 0xFF]),
        FAILED_BAD_AUTH: Buffer.from([0x01, 0xFF]),
        CONTINUE: Buffer.from([0x01, 0x00]),
    },
    socks4: {
        CONTINUE: Buffer.from([0x05, 0x00]),
        NOT_FOUND: Buffer.from([0x00, 0x5b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
        SERVER_DOWN: Buffer.from([0x00, 0x5b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
        OK: Buffer.from([0x00, 0x5a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),

        FAILED_NO_AUTH: Buffer.from([0x00, 0x5c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
        FAILED_BAD_AUTH: Buffer.from([0x00, 0x5d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    },
    http: {
        NOT_FOUND: "HTTP/1.1 404 NOT FOUND\r\n\r\n",
        OK: "HTTP/1.1 200 OK\r\n\r\n",
        SERVER_DOWN: "HTTP/1.1 503 Service Unavailable\r\n\r\n",

        FAILED_NO_AUTH: "HTTP/1.1 407 Proxy Authentication Required\r\n\r\n",
        FAILED_BAD_AUTH: "HTTP/1.1 401 Unauthorized\r\n\r\n",
    },
}

module.exports = (type, message, stream) => {
    let messageType = messagesTypes[type]

    if(messageType[message]){
        stream.write(messageType[message])
    } else {
        stream.write(messageType.not_found)
    }
}