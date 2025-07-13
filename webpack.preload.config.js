const path = require("path");

module.exports = {
  entry: "./src/preload.js",
  target: "electron-preload",
  mode: "development",
  externals: {
    electron: "commonjs electron",
  },
};
