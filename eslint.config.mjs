import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import n from "eslint-plugin-n"
import jsdoc from 'eslint-plugin-jsdoc';

export default defineConfig({
  plugins: {n, jsdoc},
  files: ['**/*.{js,ts}'],
  extends: [js.configs.recommended, tseslint.configs.recommended, 'n/recommended-module'],
  /*
  rules: {
      ...jsdoc.configs['flat/recommended'].rules
  }
      */
});
