const HtmlWebpackPlugin = require("html-webpack-plugin");
const rules = require("./webpack.rules");

rules.push({
  test: /\.(js|jsx)$/,
  exclude: /node_modules/,
  use: {
    loader: "babel-loader",
    options: {
      presets: ["@babel/preset-env", "@babel/preset-react"],
    },
  },
});

module.exports = {
  entry: "./src/renderer.js",
  module: {
    rules,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
};
