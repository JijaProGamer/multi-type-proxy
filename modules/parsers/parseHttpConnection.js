module.exports = (data) => {
    let result = {}
    let dataLines = data.split("\r\n")
    dataLines.pop()
    dataLines.pop()
    dataLines.shift()

    for (let line of dataLines){
        let options = line.split(": ")
        result[options[0]] = options[1]
    }

    return result
}