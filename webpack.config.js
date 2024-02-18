const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/index.js",
  devServer: {
    static: "./dist",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
  },
};
