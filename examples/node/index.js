"use strict";

const fs = require("fs");
const path = require("path");
const debug = require("debug")("http2push-gae");
const log = debug;
const err = (...args) => { debug("Error:", ...args); };
const express = require("express");
const singleFileApp = express();
const multiFileApp = express();
const multiFileMiddlewareApp = express();
const http2push = require("./http2push.js");

///////////////////////////////////////////////////////////////////////////////
//
//  Single-file Manifest Server Setup
//
///////////////////////////////////////////////////////////////////////////////

const STATIC_DIR = "./static";

// Use the built-in express middleware for serving static files from './static'
// Configure the push system to send headers for those paths
let singleFilePushConfig = http2push({
  push_manifest: "./single_file_push_manifest.json",
  root: STATIC_DIR
});
singleFileApp.use(express.static(STATIC_DIR, {
  setHeaders: singleFilePushConfig.setHeaders
}));

let multiFilePushConfig = http2push({
  push_manifest: "./multi_file_push_manifest.json",
  root: STATIC_DIR
});

multiFileApp.use(express.static(STATIC_DIR, {
  setHeaders: multiFilePushConfig.setHeaders
}));

// Test handling custom paths
let customPaths = ["/", "/static"];
let indexPath = path.resolve(STATIC_DIR, "index.html");
let handler = (req, res) => {
  // These paths explicitly call into the module to decorate their responses
  multiFilePushConfig.setHeadersFor(res, indexPath);
  res.sendFile(indexPath);
};
customPaths.forEach((route) => {
  multiFileMiddlewareApp.get(route, handler);
});
// Handling for routes not covered elsewhere. Mirrors "setHeaders" behavior.
multiFileMiddlewareApp.use(multiFilePushConfig);
multiFileMiddlewareApp.use(express.static(STATIC_DIR));

///////////////////////////////////////////////////////////////////////////////
//
//  Server Startup
//
///////////////////////////////////////////////////////////////////////////////
log(`NODE_ENV: ${process.env.NODE_ENV}`);

const port = ((startingPort) => {
  return () => { return startingPort++; };
})(parseInt(process.env.PORT || 8080, 10));

let singleFileServer = singleFileApp.listen(port(), () => {
  log(`Single-file app listening on port ${singleFileServer.address().port}`);
});

let multiFileServer = multiFileApp.listen(port(), () => {
  log(`Multi-file app listening on port ${multiFileServer.address().port}`);
});

let multiFileMiddlewareServer = multiFileMiddlewareApp.listen(port(), () => {
  log(`Middleware app listening on port ${multiFileMiddlewareServer.address().port}`);
  log(`Press Ctrl+C to quit.`);
});
