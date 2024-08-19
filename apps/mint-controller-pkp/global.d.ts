/// <reference types="node" />

declare global {
  var Buffer: any
  var process: NodeJS.Process
  var crypto: Crypto
  var Stream: any
  var http: typeof import('node:http')
  var https: typeof import('node:https')
  var zlib: typeof import('node:zlib')
  var EventEmitter: any
  var net: typeof import('node:net')
  var tls: typeof import('node:tls')
  var URL: typeof URL
}

export {}
