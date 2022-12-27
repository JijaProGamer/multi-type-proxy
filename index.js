const net = require('net');
const dns = require("dns")

const identify = require("./modules/identifyProxy")
const parse = require("./modules/parseProxy")

const server = net.createServer(socket => {
    let stage = 0

    let initListener = (data) => {
        let type = identify(data)
        if (!type) return socket.end()

        let result = parse(type, data, stage)
        if (!result) return socket.end()
        
        if (result.finished) {
            socket.removeListener("data", initListener)

            dns.lookup(result.host, (err, address) => {
                if (err) return socket.end()
                if (address == "0.0.0.0") return socket.end()

                let upstream = net.connect(result.port, address, () => {
                    upstream.on("data", (data) => {
                        socket.write(data)
                    })

                    socket.on("data", (data) => {
                        upstream.write(data)
                    })

                    switch (type) {
                        case "http":
                            if (result.isTTL) {
                                socket.write('HTTP/1.1 200 OK\r\n\r\n');
                            } else {
                                upstream.write(data)
                            }

                            break
                        case "socks4":
                            socket.write(Buffer.from([0, 0x5a, 0, 0, 0, 0, 0, 0]))
                            break
                        case "socks5":
                            socket.write(Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]))
                            break
                    }

                    upstream.on("end", () => {
                        socket.end()
                    })

                    upstream.on("error", (err) => {
                        socket.end()
                    })
                })
            })
        } else {
            if (type == "socks5") {
                switch (stage) {
                    case 0:
                        if (result.authType == "user:pass") {
                            socket.write(Buffer.from([0x05, 0x02]))
                        } else {
                            socket.write(Buffer.from([0x05, 0x00]))
                        }
                        break;
                    case 1:
                        socket.write(Buffer.from([0x01, 0x00]))
                        break;
                }
            } else {
                socket.write(Buffer.from([0x05, 0x00]))
            }
        }

        stage += 1
        if (result.skipAuth) stage += 1
    }

    socket.on("error", () => { })
    socket.on('data', initListener);
});

server.listen(1080);