const path = require("path");

module.exports = {
  /**
   * This is the preload script entry point for your application, it's the first file
   * that runs in the renderer process.
   */
  entry: "./src/preload.js",
  // Put your normal webpack config below here
  module: {
    rules: require("./webpack.rules"),
  },
};
