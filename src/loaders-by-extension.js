extsToRegExp = (exts) => {
    return new RegExp("\\.(" + exts.map((ext) => {
        return ext.replace(/\./g, "\\.")
    }).join("|") + ")(\\?.*)?$")
}

module.exports = function loadersByExtension(obj) {
    var loaders = []
    Object.keys(obj).forEach((key) => {
        var exts = key.split("|")
        var value = obj[key]
        var entry = {
            test: extsToRegExp(exts)
        }
        if (Array.isArray(value)) {
            entry.loaders = value
        } else if (typeof value === "string") {
            entry.loader = value
        } else {
            Object.keys(value).forEach((valueKey) => {
                entry[valueKey] = value[valueKey]
            })
        }
        loaders.push(entry)
    })
    return loaders
}
