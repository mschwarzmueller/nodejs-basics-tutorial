// Copyright 2014 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)

var sourceMappingURL = require("source-map-url")
var resolveUrl       = require("./resolve-url")
var urix             = require("urix")
var atob             = require("atob")



function callbackAsync(callback, error, result) {
  setImmediate(function() { callback(error, result) })
}

function sig(name, codeOrMap, url, read, callback) {
  var type = (name.indexOf("Sources") >= 0 ? "map" : "code")

  var throwError = function(num, what, got) {
    throw new Error(
      name + " requires argument " + num + " to be " + what + ". Got:\n" + got
    )
  }

  if (type === "map") {
    if (typeof codeOrMap !== "object" || codeOrMap === null) {
      throwError(1, "a source map", codeOrMap)
    }
  } else {
    if (typeof codeOrMap !== "string") {
      throwError(1, "some code", codeOrMap)
    }
  }
  if (typeof url !== "string") {
    throwError(2, "the " + type + " url", url)
  }
  if (typeof read !== "function") {
    throwError(3, "a reading function", read)
  }
  if (arguments.length === 1 + 4 && typeof callback !== "function") {
    throwError(4, "a callback function", callback)
  }
}

function parseMapToJSON(string) {
  return JSON.parse(string.replace(/^\)\]\}'/, ""))
}



function resolveSourceMap(code, codeUrl, read, callback) {
  sig("resolveSourceMap", code, codeUrl, read, callback)
  var mapData
  try {
    mapData = resolveSourceMapHelper(code, codeUrl)
  } catch (error) {
    return callbackAsync(callback, error)
  }
  if (!mapData || mapData.map) {
    return callbackAsync(callback, null, mapData)
  }
  read(mapData.url, function(error, result) {
    if (error) {
      return callback(error)
    }
    try {
      mapData.map = parseMapToJSON(String(result))
    } catch (error) {
      return callback(error)
    }
    callback(null, mapData)
  })
}

function resolveSourceMapSync(code, codeUrl, read) {
  sig("resolveSourceMapSync", code, codeUrl, read)
  var mapData = resolveSourceMapHelper(code, codeUrl)
  if (!mapData || mapData.map) {
    return mapData
  }
  mapData.map = parseMapToJSON(String(read(mapData.url)))
  return mapData
}

var dataUriRegex = /^data:([^,;]*)(;[^,;]*)*(?:,(.*))?$/
var jsonMimeTypeRegex = /^(?:application|text)\/json$/

function resolveSourceMapHelper(code, codeUrl) {
  codeUrl = urix(codeUrl)

  var url = sourceMappingURL.get(code)
  if (!url) {
    return null
  }

  var dataUri = url.match(dataUriRegex)
  if (dataUri) {
    var mimeType = dataUri[1]
    var lastParameter = dataUri[2]
    var encoded = dataUri[3]
    if (!jsonMimeTypeRegex.test(mimeType)) {
      throw new Error("Unuseful data uri mime type: " + (mimeType || "text/plain"))
    }
    return {
      sourceMappingURL: url,
      url: null,
      sourcesRelativeTo: codeUrl,
      map: parseMapToJSON(lastParameter === ";base64" ? atob(encoded) : decodeURIComponent(encoded))
    }
  }

  var mapUrl = resolveUrl(codeUrl, url)
  return {
    sourceMappingURL: url,
    url: mapUrl,
    sourcesRelativeTo: mapUrl,
    map: null
  }
}



function resolveSources(map, mapUrl, read, callback) {
  sig("resolveSources", map, mapUrl, read, callback)
  var pending = map.sources.length
  var errored = false
  var sources = []

  var done = function(error) {
    if (errored) {
      return
    }
    if (error) {
      errored = true
      return callback(error)
    }
    pending--
    if (pending === 0) {
      callback(null, sources)
    }
  }

  resolveSourcesHelper(map, mapUrl, function(fullUrl, sourceContent, index) {
    if (typeof sourceContent === "string") {
      sources[index] = sourceContent
      callbackAsync(done, null)
    } else {
      read(fullUrl, function(error, result) {
        sources[index] = String(result)
        done(error)
      })
    }
  })
}

function resolveSourcesSync(map, mapUrl, read) {
  sig("resolveSourcesSync", map, mapUrl, read)
  var sources = []
  resolveSourcesHelper(map, mapUrl, function(fullUrl, sourceContent, index) {
    if (typeof sourceContent === "string") {
      sources[index] = sourceContent
    } else {
      sources[index] = String(read(fullUrl))
    }
  })
  return sources
}

var endingSlash = /\/?$/

function resolveSourcesHelper(map, mapUrl, fn) {
  mapUrl = urix(mapUrl)
  var fullUrl
  var sourceContent
  for (var index = 0, len = map.sources.length; index < len; index++) {
    if (map.sourceRoot) {
      // Make sure that the sourceRoot ends with a slash, so that `/scripts/subdir` becomes
      // `/scripts/subdir/<source>`, not `/scripts/<source>`. Pointing to a file as source root
      // does not make sense.
      fullUrl = resolveUrl(mapUrl, map.sourceRoot.replace(endingSlash, "/"), map.sources[index])
    } else {
      fullUrl = resolveUrl(mapUrl, map.sources[index])
    }
    sourceContent = (map.sourcesContent || [])[index]
    fn(fullUrl, sourceContent, index)
  }
}



function resolve(code, codeUrl, read, callback) {
  sig("resolve", code, codeUrl, read, callback)
  resolveSourceMap(code, codeUrl, read, function(error, mapData) {
    if (error) {
      return callback(error)
    }
    if (!mapData) {
      return callback(null, null)
    }
    resolveSources(mapData.map, mapData.sourcesRelativeTo, read, function(error, sources) {
      if (error) {
        return callback(error)
      }
      mapData.sources = sources
      callback(null, mapData)
    })
  })
}

function resolveSync(code, codeUrl, read) {
  sig("resolveSync", code, codeUrl, read)
  var mapData = resolveSourceMapSync(code, codeUrl, read)
  if (!mapData) {
    return null
  }
  mapData.sources = resolveSourcesSync(mapData.map, mapData.sourcesRelativeTo, read)
  return mapData
}



module.exports = {
  resolveSourceMap:     resolveSourceMap,
  resolveSourceMapSync: resolveSourceMapSync,
  resolveSources:       resolveSources,
  resolveSourcesSync:   resolveSourcesSync,
  resolve:              resolve,
  resolveSync:          resolveSync
}
