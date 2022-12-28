let proxyClass = require("./index")
let proxy = new proxyClass()
proxy.procError = () => {}
proxy.dnsError = () => {}

const net = require("net")

proxy.data_processor = (upConnection, connections) => {
    return new Promise((resolve, reject) => {        
        let upstream = net.connect(upConnection.port, upConnection.address, () => {                      
            connections.up.on("data", (data) => {
                upstream.write(data)
            })

            upstream.on("data", (data) => {
                connections.down.write(data)
            })

            resolve(upstream)
        })
    })
}

proxy.handler = (k, e, upstream) => {
    return true //!upstream.isTTL
}

proxy.listen(1080)