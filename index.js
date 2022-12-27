const net = require('net');
const dns = require("dns")

const identify = require("./modules/identifyProxy")
const parse = require("./modules/parseProxy");
const hideProxyInfo = require('./modules/hideProxyInfo');
const { PassThrough } = require('stream');

let defaultDNS = (address) => {
    return new Promise((resolve, reject) => {
        dns.lookup(address, (err, newAddress) => {
            if (err) return reject(err)
            if (newAddress == "0.0.0.0") return reject(`Invalid address`)

            resolve(newAddress)
        })
    })
}

let defaultDataProcessor = (upConnection, connections) => {
    return new Promise((resolve, reject) => {        
        let upstream = net.connect(upConnection.port, upConnection.address, () => {
            connections.up.pipe(upstream)
            upstream.pipe(connections.down)

            resolve(upstream)
        })
    })
}

class Proxy {
    constructor(port) {
        if (!this.connected) this.connected = () => { }
        if (!this.handler) this.handler = () => { return true }
        if (!this.authenticate) this.authenticate = () => { return true }
        if (!this.dnsGet) this.dnsGet = defaultDNS
        if (!this.data_processor) this.data_processor = defaultDataProcessor

        let server = net.createServer()

        server.on("connection", (socket) => {
            let stage = 0
            let auth

            let initListener = async (data) => {
                let type = identify(data)
                if (!type) return socket.end()

                let result = parse(type, data, stage)
                if (!result) return socket.end()

                if (type == "http") data = hideProxyInfo(data.toString())

                let canContinue = await this.handler(type, stage, result)
                if (!canContinue) {
                    socket.removeListener("data", initListener)
                    return socket.end()
                }

                if (result.auth) auth = result.auth

                if (result.finished) {
                    socket.removeListener("data", initListener)

                    let authGood = await this.authenticate(auth)
                    if (!authGood) return socket.end()

                    this.dnsGet(result.host).then((address) => {
                        this.connected({ address, port }, auth)

                        let up = new PassThrough()
                        let down = new PassThrough()

                        this.data_processor({
                            address,
                            port: result.port
                        }, {
                            up: up,
                            down: down,
                        }).then((upstream) => {                            
                            down.pipe(socket)
                            socket.pipe(up)

                            upstream.on("error", (err) => socket.end)
                            upstream.on("end", socket.end)

                            switch (type) {
                                case "http":
                                    if (result.isTTL) {
                                        down.write('HTTP/1.1 200 OK\r\n\r\n');
                                    } else {
                                        up.write(data)
                                    }

                                    break
                                case "socks4":
                                    down.write(Buffer.from([0, 0x5a, 0, 0, 0, 0, 0, 0]))
                                    break
                                case "socks5":
                                    down.write(Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]))
                                    break
                            }
                        }).catch(() => {
                            socket.end()
                        })
                    }).catch((err) => {
                        socket.end()
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

            socket.on("data", initListener)
            socket.on("error", (err) => { })
        })

        server.on("error", (err) => {
            console.log(err)
        })

        server.listen(port)
    }
}

module.exports = Proxy