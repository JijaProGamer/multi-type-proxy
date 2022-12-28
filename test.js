let proxyClass = require("./index")
let proxy = new proxyClass()
proxy.procError = () => {}
proxy.dnsError = () => {}

proxy.listen(1080)