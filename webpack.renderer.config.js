const HtmlWebpackPlugin = require("html-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const TerserPlugin = require("terser-webpack-plugin");
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

const isDevelopment = process.env.NODE_ENV !== "production";
const shouldAnalyze = process.env.ANALYZE === "true";

const plugins = [
  new HtmlWebpackPlugin({
    template: "./public/index.html",
  }),
];

// Add bundle analyzer if requested
if (shouldAnalyze) {
  plugins.push(new BundleAnalyzerPlugin());
}

module.exports = {
  entry: "./src/renderer.js",
  module: {
    rules,
  },
  plugins,
  // Performance optimizations
  optimization: {
    splitChunks: {
      chunks: "all",
      maxInitialRequests: 10,
      maxAsyncRequests: 10,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
          priority: 10,
          enforce: true,
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: "react",
          chunks: "all",
          priority: 20,
          enforce: true,
        },
        electron: {
          test: /[\\/]node_modules[\\/](electron|@electron)[\\/]/,
          name: "electron",
          chunks: "all",
          priority: 15,
          enforce: true,
        },
        common: {
          name: "common",
          minChunks: 2,
          chunks: "all",
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
    minimize: !isDevelopment,
    runtimeChunk: "single",
    minimizer: isDevelopment
      ? []
      : [
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true,
                drop_debugger: true,
              },
              mangle: true,
            },
            extractComments: false,
          }),
        ],
  },
  // Enable tree shaking
  mode: isDevelopment ? "development" : "production",
  // Increase bundle size limits for Electron apps
  performance: {
    hints: isDevelopment ? false : "warning",
    maxEntrypointSize: 1024000, // 1MB
    maxAssetSize: 1024000, // 1MB
  },
  // Development optimizations
  devtool: isDevelopment ? "eval-source-map" : false,
};
