import globals from "globals";
import pluginJs from "@eslint/js";


/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ["dist/**", "docs/**", "coverage/**", "types/**"] },
  { files: ["scripts/**", "test/**"], languageOptions: { globals: globals.node } },
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
];