const net = require('net');
const dns = require("dns")

const identify = require("./modules/identifyProxy")
const parse = require("./modules/parseProxy")

const server = net.createServer(socket => {
    let stage = 0

    let initListener = (data) => {
        let type = identify(data)
        if(!type) return socket.end()

        let result = parse(type, data, stage)
        if(!result) return socket.end()
        
        if (result.finished){
            socket.removeListener("data", initListener)

            dns.lookup(result.host, (err, address) => {
                if(err) return socket.end()
                if(address == "0.0.0") return socket.end()

                let upstream = net.connect(result.port, address, () => {
                    upstream.on("data", (data) => {
                        socket.write(data)
                    })

                    socket.on("data", (data) => {
                        upstream.write(data)
                    })

                    if(type == "http"){
                        if(result.isTTL){
                            socket.write('HTTP/1.1 200 OK\r\n\r\n');
                        } else {
                            upstream.write(data.toString())
                        }
                    } else {
                        socket.write(Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]))
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
            switch (stage){
                case 0: 
                    socket.write(Buffer.from([0x05, 0x00]))
                    break;
                case 1: 
                    
                    break;
            }
        }

        stage += 1
        if(result.skipAuth) stage += 1
    } 

    socket.on("error", () => {})
    socket.on('data', initListener);
});

server.listen(1080);