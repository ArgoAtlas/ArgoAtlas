import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  { ignores: ["dist/"] },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  {
    files: [
      "server.js",
      "models/**/*.js",
      "src/flowCli.js",
      "src/h3FlowAggregation.js",
      "webpack.config.js",
      "eslint.config.js",
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["src/index.js"],
    languageOptions: { globals: globals.browser },
  },
];
