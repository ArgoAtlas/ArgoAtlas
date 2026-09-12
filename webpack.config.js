import * as path from "path";
import { fileURLToPath } from "url";

export default {
  mode: "development",
  entry: "./src/index.js",
  devServer: {
    static: "./dist",
  },
  // maplibre-gl constructs its worker from a computed expression, which webpack
  // cannot resolve statically. The warning is benign, but webpack-dev-server
  // renders it in a full-page overlay that covers the map.
  ignoreWarnings: [
    {
      module: /node_modules[\\/]maplibre-gl/,
      message:
        /Critical dependency: the request of a dependency is an expression/,
    },
  ],
  output: {
    path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "dist"),
    filename: "main.js",
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          {
            loader: "css-loader",
            options: { modules: true },
          },
        ],
      },
    ],
  },
};
