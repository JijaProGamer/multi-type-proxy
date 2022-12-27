const parseHttp = require("./parsers/parseHttpConnection")

const connection_types = {
    socks5: {
        1: "CONNECT",
    },
    socks4: {
        1: "CONNECT"
    }
}

module.exports = (type, data, stage) => {
    switch (type) {
        case "http":            
            data = data.toString()

            var options = parseHttp(data)
            var ParentHost = options["Host"].split(":")

            var isTTL = data.includes("CONNECT")
            var host = ParentHost[0]
            var port = parseInt(ParentHost[1]) || (isTTL && 443 || 80)
            var auth = options["Proxy-Authorization"]

            var username
            var password

            if (auth) {
                const decodedCredentials = Buffer.from(auth.split(" ")[1], 'base64').toString('utf8').split(":")
                auth = {}

                auth.username = decodedCredentials[0]
                auth.password = decodedCredentials[1]
            }

            return {
                isTTL,
                host,
                port,
                request: data,
                finished: true,
                authType: auth && "user:pass" || "none",
                skipAuth: false,
                auth,
            }
        case "socks4":
            var cmd = data[1];

            var uBuff = Buffer.alloc(256)
            var pBuff = Buffer.alloc(256)

            var offset = 8
            var uLen = 0
            let pLen = 0

            while (data[offset] !== 0x00 && data[offset]) {
                uBuff[uLen] = data[offset];
                uLen++;
                offset++;
            }

            offset++;

            while (data[offset] !== 0x00 && data[offset]) {
                pBuff[pLen] = data[offset];
                pLen++;
                offset++;
            }

            var auth

            if(uLen > 0){
                auth = {
                    password: pBuff.toString('utf8', 0, pLen),
                    username: uBuff.toString('utf8', 0, uLen)
                }
            }

            return {
                isTTL: connection_types.socks4[cmd] == "CONNECT",
                host: data.slice(4, 8).join('.'),
                port: parseFloat(data.readUInt16BE(2)),
                request: data,
                finished: true,
                authType: uLen > 0 && "user:pass" || "none",
                skipAuth: false,
                auth,
            }
        case "socks5":
            switch (stage) {
                case 0:
                    const nmethods = data[1]
                    const methods = data.slice(2, 2 + nmethods)

                    if (methods[1] == 0x02) {
                        return {
                            request: data,
                            finished: false,
                            authType: "user:pass",
                            skipAuth: false,
                        }
                    } else {
                        return {
                            request: data,
                            finished: false,
                            authType: "none",
                            skipAuth: true,
                        }
                    }
                case 1:
                    var uLen = data[1];
                    let pLen = data[2 + uLen];

                    const username = data.slice(2, 2 + uLen).toString('utf8');
                    const password = data.slice(2 + uLen + 1, 2 + uLen + 1 + pLen).toString('utf8');

                    return {
                        request: data,
                        finished: false,
                        authType: "user:pass",
                        skipAuth: false,
                        auth: {username, password},
                    }
                case 2:
                    const cmd = data[1];
                    const addressType = data[3];

                    var host
                    var port

                    switch (addressType) {
                        case 1:
                            host = data.slice(4, 8).join(".")
                            port = parseFloat(data.readUInt16BE(8))
                            break;
                        case 3:
                            host = data.slice(5, 5 + data[4]).toString()
                            port = data.readUInt16BE(5 + data[4])
                            break;
                        case 4:
                            host = data.slice(4, 20).join(":")
                            port = parseFloat(data.readUInt16BE(20))
                            break;
                        default:
                            return {
                                isTTL: connection_types.socks5[addressType] == "CONNECT",
                                failed: true,
                                request: data,
                            }
                    }

                    return {
                        isTTL: connection_types.socks5[cmd] == "CONNECT",
                        host,
                        port,
                        finished: true,
                        request: data,
                    }
                case 2:
            }
    }
}