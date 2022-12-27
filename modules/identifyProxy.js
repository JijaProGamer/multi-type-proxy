module.exports = (data) => {
    if(data[0] == 0x04){
        return "socks4"
    }

    if(data[0] == 0x05){
        return "socks5"
    }

    return "http"
}