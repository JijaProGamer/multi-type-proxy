module.exports = (data) => {
    let result = ""
    let lines = data.split("\r\n")

    for(let line of lines){
        if(!line.includes("Proxy-")){
            result += `${line}\r\n`
        }
    }

    return result
}