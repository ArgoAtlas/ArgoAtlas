import * as path from "path";
import { fileURLToPath } from "url";

export default {
  mode: "development",
  entry: "./src/index.js",
  devServer: {
    static: "./dist",
  },
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
