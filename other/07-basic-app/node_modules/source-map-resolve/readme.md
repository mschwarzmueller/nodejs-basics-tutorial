Overview [![Build Status](https://travis-ci.org/lydell/source-map-resolve.png?branch=master)](https://travis-ci.org/lydell/source-map-resolve)
========

[![browser support](https://ci.testling.com/lydell/source-map-resolve.png)](https://ci.testling.com/lydell/source-map-resolve)

Resolve the source map and/or sources for a generated file.

```js
var sourceMapResolve = require("source-map-resolve")
var sourceMap        = require("source-map")

var code = [
  "!function(){...}();",
  "/*# sourceMappingURL=foo.js.map */"
].join("\n")

sourceMapResolve.resolveSourceMap(code, "/js/foo.js", fs.readFile, function(error, result) {
  if (error) {
    return notifyFailure(error)
  }
  result
  // {
  //   map: {file: "foo.js", mappings: "...", sources: ["/coffee/foo.coffee"], names: []},
  //   url: "/js/foo.js.map",
  //   sourcesRelativeTo: "/js/foo.js.map",
  //   sourceMappingURL: "foo.js.map"
  // }

  sourceMapResolve.resolveSources(result.map, result.sourcesRelativeTo, fs.readFile, function(error, result) {
    if (error) {
      return notifyFailure(error)
    }
    result
    // ["<contents of /coffee/foo.coffee>"]
  })
})

sourceMapResolve.resolve(code, "/js/foo.js", fs.readFile, function(error, result) {
  if (error) {
    return notifyFailure(error)
  }
  result
  // {
  //   map: {file: "foo.js", mappings: "...", sources: ["/coffee/foo.coffee"], names: []},
  //   url: "/js/foo.js.map",
  //   sourcesRelativeTo: "/js/foo.js.map",
  //   sourceMappingURL: "foo.js.map",
  //   sources: ["<contents of /coffee/foo.coffee>"]
  // }
  result.map.sourcesContent = result.sources
  var map = new sourceMap.sourceMapConsumer(result.map)
  map.sourceContentFor("/coffee/foo.coffee")
  // "<contents of /coffee/foo.coffee>"
})
```


Installation
============

- `npm install source-map-resolve`
- `bower install source-map-resolve`
- `component install lydell/source-map-resolve`

Works with CommonJS, AMD and browser globals, through UMD.

Note: This module requires `setImmediate` and `atob`.
Use polyfills if needed, such as:

- <https://github.com/NobleJS/setImmediate>
- <https://github.com/davidchambers/Base64.js>


Usage
=====

### `sourceMapResolve.resolveSourceMap(code, codeUrl, read, callback)` ###

- `code` is a string of code that may or may not contain a sourceMappingURL
  comment. Such a comment is used to resolve the source map.
- `codeUrl` is the url to the file containing `code`. If the sourceMappingURL
  is relative, it is resolved against `codeUrl`.
- `read(url, callback)` is a function that reads `url` and responds using
  `callback(error, content)`. In Node.js you might want to use `fs.readFile`,
  while in the browser you might want to use an asynchronus `XMLHttpRequest`.
- `callback(error, result)` is a function that is invoked with either an error
  or `null` and the result.

The result is an object with the following properties:

- `map`: The source map for `code`, as an object (not a string).
- `url`: The url to the source map. If the source map came from a data uri,
  this property is `null`, since then there is no url to it.
- `sourcesRelativeTo`: The url that the sources of the source map are relative
  to. Since the sources are relative to the source map, and the url to the
  source map is provided as the `url` property, this property might seem
  superfluos. However, remember that the `url` property can be `null` if the
  source map came from a data uri. If so, the sources are relative to the file
  containing the data uri—`codeUrl`. This property will be identical to the
  `url` property or `codeUrl`, whichever is appropriate. This way you can
  conveniently resolve the sources without having to think about where the
  source map came from.
- `sourceMappingURL`: The url of the sourceMappingURL comment in `code`.

If `code` contains no sourceMappingURL, the result is `null`.

### `sourceMapResolve.resolveSources(map, mapUrl, read, callback)` ###

- `map` is a source map, as an object (not a string).
- `mapUrl` is the url to the file containing `map`. Relative sources in the
  source map, if any, are resolved against `mapUrl`.
- `read(url, callback)` is a function that reads `url` and responds using
  `callback(error, content)`. In Node.js you might want to use `fs.readFile`,
  while in the browser you might want to use an asynchronus `XMLHttpRequest`.
- `callback(error, result)` is a function that is invoked with either an error
  or `null` and the result.

The result is an array with the contents of all sources in `map.sources`, in
the same order as `map.sources`.

### `sourceMapResolve.resolve(code, codeUrl, read, callback)` ###

The arguments are identical to `sourceMapResolve.resolveSourceMap`.

This is simply a convienience method that first resolves the source map and
then its sources. You could also do this by first calling
`sourceMapResolve.resolveSourceMap` and then `sourceMapResolve.resolveSources`.

The result is identical to `sourceMapResolve.resolveSourceMap`, except that the
result object has one more property: `sources`, which is the result of
`sourceMapResolve.resolveSources`.

### `sourceMapResolve.*Sync()` ###

There are also sync versions of the three previous functions. They are identical
to the async versions, except:

- They expect a sync reading function. In Node.js you might want to use
  `fs.readFileSync`, while in the browser you might want to use a synchronus
  `XMLHttpRequest`.
- They throw errors and return the result instead of using a callback.


Note
====

This module resolves the source map for a given generated file by looking for a
sourceMappingURL comment. The spec defines yet a way to provide the URL to the
source map: By sending the `SourceMap: <url>` header along with the generated
file. Since this module doesn’t retrive the generated code for you (instead
_you_ give the generated code to the module), it’s up to you to look for such a
header when you retrieve the file (should the need arise).


Development
===========

Tests
-----

First off, run `npm install` to install testing modules and browser polyfills.

`npm test` lints the code and runs the test suite in Node.js.

To run the tests in a browser, run `testling` (`npm install -g testling`) or
`testling -u`.

x-package.json5
---------------

package.json, component.json and bower.json are all generated from
x-package.json5 by using [`xpkg`]. Only edit x-package.json5, and remember to
run `xpkg` before commiting!

[`xpkg`]: https://github.com/kof/node-xpkg

Generating the browser version
------------------------------

source-map-resolve.js is generated from source-map-resolve-node.js and
source-map-resolve-template.js. Only edit the two latter files, _not_
source-map-resolve.js! To generate it, run `node generate-source-map-resolve.js`


License
=======

[The X11 (“MIT”) License](LICENSE).
