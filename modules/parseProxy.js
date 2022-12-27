const parseHttp = require("./parsers/parseHttpConnection")

const connection_types = {
    socks5: {
        1: "CONNECT",
    },
}

module.exports = (type, data, stage) => {
    switch (type) {
        case "http":
            data = data.toString()
            let options = parseHttp(data)
            let ParentHost = options["Host"].split(":")

            let isTTL = data.includes("CONNECT")
            let host = ParentHost[0]
            let port = parseInt(ParentHost[1]) || (isTTL && 443 || 80)
            let auth = options["Proxy-Authentification"]

            return {
                isTTL,
                host,
                port,
                request: data,
                finished: true,
                authType: auth && "user:pass" || "none",
                skipAuth: false,
                auth
            }
        case "socks4":

            return
        case "socks5":
            switch (stage) {
                case 0:
                    const nmethods = data[1]
                    const methods = data.slice(2, 2 + nmethods)
                    
                    if(methods[0] == 0x00){
                        return {
                            request: data,
                            finished: false,
                            authType: "none",
                            skipAuth: true,
                        } 
                    } else {
                        return {
                            request: data,
                            finished: false,
                            authType: "user:pass",
                            skipAuth: false,
                        } 
                    }
                case 1:

                case 2:
                    const cmd = data[1];
                    const addressType = data[3];

                    let host
                    let port

                    switch (addressType){
                        case 1:
                            host = data.slice(4, 8).join(".")
                            port = parseFloat(data.readUInt16BE(8))
                            break;
                        case 3:
                            host = data.slice(5, 5 +  data[4]).toString()
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