const net = require('net');
const dns = require("dns")

const identify = require("./modules/identifyProxy")
const parse = require("./modules/parseProxy");
const hideProxyInfo = require('./modules/hideProxyInfo');
const sendMessage = require("./modules/sendMessage")

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
    static #e = -1

    constructor() {
        if (!this.connected) this.connected = () => { }
        if (!this.handler) this.handler = () => { return true }
        if (!this.authenticate) this.authenticate = () => { return true }
        if (!this.dnsGet) this.dnsGet = defaultDNS

        if(!this.dnsError) this.dnsError = console.log
        if(!this.procError) this.procError = console.log

        if (!this.data_processor) this.data_processor = defaultDataProcessor

        let server = net.createServer()

        server.on("connection", (socket) => {
            let stage = 0
            let auth

            let initListener = async (data) => {
                let type = identify(data)
                let result = parse(type, data, stage)

                if (result.auth) auth = result.auth
                if (result.failed) {
                    socket.removeListener("data", initListener)
                    return socket.end()
                }

                if (type == "http") data = hideProxyInfo(data.toString())

                let canContinue = await this.handler(type, stage, result)

                if (!canContinue) {
                    sendMessage(type, "SERVER_DOWN", socket)
                    
                    socket.removeListener("data", initListener)
                    return socket.end()
                } else {
                    if(canContinue !== true){
                        sendMessage(type, canContinue, socket)

                        socket.removeListener("data", initListener)
                        return socket.end()
                    }
                }

                if (result.finished) {
                    socket.removeListener("data", initListener)

                    let authGood = await this.authenticate(auth, socket)
                    if (!authGood){
                        if(auth){
                            sendMessage(type, "FAILED_BAD_AUTH", socket)
                        } else {
                            sendMessage(type, "FAILED_NO_AUTH", socket)
                        }

                        socket.removeListener("data", initListener)
                        return socket.end()
                    }

                    this.dnsGet(result.host).then((address) => {
                        this.connected({ address, port: result.port }, auth)

                        let up = new PassThrough()
                        let down = new PassThrough()

                        this.data_processor({
                            address,
                            port: result.port
                        }, {
                            up: up,
                            down: down,
                        }, authGood).then((upstream) => {                            
                            down.pipe(socket)
                            socket.pipe(up)

                            upstream.on("error", (err) => socket.end)
                            upstream.on("end", socket.end)

                            switch (type) {
                                case "http":
                                    if (result.isTTL) {
                                        sendMessage("http", "OK", down)
                                    } else {
                                        up.write(data)
                                    }

                                    break
                                default:
                                    sendMessage(type, "OK", down)
                                    break;
                            }
                        }).catch((err) => {
                            sendMessage(type, "SERVER_DOWN", socket)

                            this.procError(err)
                            socket.end()
                        })
                    }).catch((err) => {
                        sendMessage(type, "NOT_FOUND", socket)

                        this.dnsError(err)
                        socket.end()
                    })
                } else {
                    if (type == "socks5") {
                        switch (stage) {
                            case 0:
                                if (result.authType == "user:pass") {
                                    sendMessage("socks5", "CONTINUE_AUTH", socket)
                                } else {
                                    sendMessage("socks5", "CONTINUE_NO_AUTH", socket)
                                }
                                break;
                            case 1:
                                sendMessage("socks5", "CONTINUE", socket)
                                break;
                        }
                    } else if (type == "socks4") {
                        sendMessage("socks4", "CONTINUE", socket)
                    }
                }

                stage += 1
                if (result.skipAuth) stage += 1
            }

            socket.on("data", initListener)
            socket.on("error", (err) => {
                this.procError(err)
            })
        })

        server.on("error", (err) => {
            this.procError(err)
        })

        this.server = server
    }

    listen(port){
        this.server.listen(port)
    }

    close(){
        this.server.close()
    }
}

module.exports = Proxy