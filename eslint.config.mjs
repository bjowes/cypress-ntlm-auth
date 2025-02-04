import pluginJs from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    plugins: { jsdoc },
    rules: {
      "jsdoc/require-description": "warn",
      "jsdoc/require-jsdoc": [
        "warn",
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
      "@typescript-eslint/no-require-imports": [
        "warn",
        { allow: ['../util/config.validator$', '../util/sso.config.validator$', '^cypress$'] }
      ] 
    },
  },
  { languageOptions: { globals: globals.browser } },
  jsdoc.configs["flat/recommended-typescript"],
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];