import pluginJs from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    plugins: { jsdoc },
    rules: {
      "jsdoc/require-description": "off",
      "jsdoc/require-jsdoc": [
        "off",
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: true,
          },
        },
      ],
    },
  },
  { languageOptions: { globals: globals.browser } },
  jsdoc.configs["flat/recommended-typescript"],
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];