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

// Add CSS loaders for CSS modules
rules.push({
  test: /\.module\.css$/,
  use: [
    "style-loader",
    {
      loader: "css-loader",
      options: {
        modules: {
          localIdentName: "[name]__[local]___[hash:base64:5]",
        },
      },
    },
  ],
});

// Add CSS loaders for regular CSS files
rules.push({
  test: /\.css$/,
  exclude: /\.module\.css$/,
  use: ["style-loader", "css-loader"],
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
