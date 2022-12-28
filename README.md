advanced nodejs proxy server
supports http, socks4 and socks5

can transfer both http and https data

can intercept the http/https data to make an rotating proxy,
an cache to save bandwith or to spy on http requests

Can handle 1 gigabit of download and upload at the same time 
with only 50MB ram usage and 2% cpu usageon an I5 10400

Can make an blazing fast proxy supporting http socks4 and socks5
connections at the same time with low CPU and RAM usage

Only uses the internal net and dns module of node

Can handle authentification on socks5 http and partially on socks4

```js
let proxyAPI = require("multi-type-proxy")
// require the module
// It returns a class, so you have to call new on it

let proxyServer = new proxyAPI()
// create a new server
// currently its not listening to any data

proxyServer.listen(port)
// make the server listen to the port given

proxyServer.close()
// Closes the server, cannot be listened to again
// You need to make another server after calling this

function proxyServer.connected
// The first when calling the function is an object with the port
// and address of the  upstream server

// The second argument is the authentification used by the client
// it may be undefined if there is no authentification used
// or it may be a {username, password} object

proxyServer.connected = (address, auth) => {
    if(user){
        console.log(`user ${auth.username} with password ${auth.password}`)
    }

    console.log(`connecting to server ${address.address}:$${address.port}`)
}

function proxyServer.dnsError
// Its called when the DNS server returns a error
// or the returned IP is the null IP (0.0.0.0)
// The only argument is the error itself

function proxyServer.procError
// Its called when the network processor returns a error
// Should never happen unless the network is unstable
// The only argument is the error itself

function proxyServer.data_processor
// This is used to transfer data between the client
// and the upstream server

// Pretty much everything is handled by this module, so
// you only have to do the bare minimum

// the first argument is an object {port, address} of the server to connect to
// the second argument is an object {up, down}
// up is the new connection you are connecting
// down is the client socket

// ********** example function ***********

let net = require("node:net")

proxyServer.data_processor = (upConnection, connections) => {
    return new Promise((resolve, reject) => {        
        let upstream = net.connect(upConnection.port, upConnection.address, () => {
            connections.up.pipe(upstream)
            upstream.pipe(connections.down)

            resolve(upstream)
        })
    })
}

function proxyServer.dnsGet
// you have to return a promise!
// the only argument gives is the address (It may be an domain or an IP)
// if its an IP you can just return it back to save time and bandwith
// if its an domain you have to use an custom DNS server to get an IP address 
// from the domain

// ********** example function ***********

let dns = require("node:dns")

proxyServer.dnsGet = (address) => {
    return new Promise((resolve, reject) => {
        dns.lookup(address, (err, newAddress) => {
            if (err) return reject(err)
            if (newAddress == "0.0.0.0") return reject(`Invalid address`)

            resolve(newAddress)
        })
    })
}

function proxyServer.authenticate
// should return a promise
// if the promise resolves with true then the socket will be usable
// if the promise resolves with false then the socket will receive
// a error 407 for http or an similar code for socks4/socks5

// The only argument may be undefined if there is no auth
// or an {username, password} Object
// password may be of length 0 if you are using socks4
// because socks4 only has username authentification

proxyServer.authenticate = (auth) => {
    if(!auth){
        return false // no credentials
    } else {
        if(auth.username == "user123" && auth.password == "password") return true

        return false // incorrect credentials
    }
}

function proxyServer.handler
// should return a promise
// if the promise resolves with true then the socket will be usable
// if the promise resolves with anything then the socket will receive
// a error 503 for http or an similar code for socks4/socks5 or the
// value that is in place of true

// the first argument is the type of proxy (socks4/socks5/http)
// the second argument is the stage of the connection
// the third argument is the result of the parsed data from the current stage

// the only stage in http has the data:
{
    isTTL, // whatever the connection is https
    host, // the domain/ip of the server connecting to
    port, // port of the server connecting to
    request: data, // The data send by the client before this request
    finished: true, // Its always going to be true for http proxy
    authType: "user:pass" || "none", // If it has authentification
    skipAuth: false, // always false for http
    auth, // The auth used, will be undefined if authType is "none"
}

// the only stage in socks4 has the data:
{
    isTTL, // whatever the connection is https
    host, // the domain/ip of the server connecting to
    port, // port of the server connecting to
    request: data, // The data send by the client before this request
    finished: true, // Its always going to be true for socks4 proxy
    authType: "user:pass" || "none", // If it has authentification
    skipAuth: false, // always false for socks4
    auth, // The auth used (only username), will be undefined if authType is "none"
}

// The stages of socks5:

//stage 0:

{
    request: data, // The data send by the client before this request
    finished: false, // false for stage 0 and 1
    authType: "user:pass" || "none", // none if there is no authentification used
    skipAuth: false || true, // true if there is no authentification used
}

//stage 1 (Only when using authentification):

{
    request: data, // The data send by the client before this request
    finished: false, // false for stage 0 and 1
    authType: "user:pass"
    skipAuth: false,
    auth: {username, password}, // Object with the username and password of the user
}

//stage 2:
// NOTE: You can get the authentification data
// only from the past request.
// If you dont use proxyServer.handler but use proxyServer.authenticate
// then this wont matter to you

{
    isTTL: port, // whatever the connection is https
    host, // the domain/ip of the server connecting to
    port, // the port of the server connecting to
    finished: true,
    request: data, // // Its always going to be true for http proxy
}

proxyServer.handler = (type, stage, result) => {
    console.log(`processing ${type} request at stage ${stage}`)
    
    if(result.finished){
        console.log(`finished processing ${type} request`)
        console.log(`Upstream server: ${result.host}:${result.port}`)
    }
}

```