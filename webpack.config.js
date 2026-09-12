import * as path from "path";
import { fileURLToPath } from "url";

export default {
  mode: "development",
  entry: "./src/index.js",
  devServer: {
    static: "./dist",
  },
  // maplibre-gl builds a worker URL from an expression in the auto-detection
  // fallback that setWorkerUrl (src/index.js) makes unreachable, so webpack
  // cannot resolve it statically. The warning is benign, but webpack-dev-server
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
      // maplibre-gl loads its worker from a sibling file at runtime. Emit the
      // worker and the shared chunk it imports as plain assets under their
      // original names, so the worker's own `./maplibre-gl-shared.mjs` import
      // resolves. The ?asset query keeps this rule from also matching the
      // shared chunk where the main maplibre bundle imports it as ordinary JS.
      {
        test: /maplibre-gl-(worker|shared)\.mjs$/,
        resourceQuery: /asset/,
        type: "asset/resource",
        generator: { filename: "[name][ext]" },
        // maplibre declares sideEffects: ["*.css", "src/**/*.ts"], so the bare
        // shared-chunk import would be tree-shaken in production mode.
        sideEffects: true,
      },
    ],
  },
};
