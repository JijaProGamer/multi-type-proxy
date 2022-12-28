let proxyClass = require("./index")
let proxy = new proxyClass()
proxy.procError = () => {}
proxy.dnsError = () => {}

proxy.handler = (k, e, upstream) => {
    if(upstream.host.includes("google")){
        return false
    }

    return true
}

proxy.listen(1080)