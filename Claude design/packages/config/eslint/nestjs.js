/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...require("./base"),
  env: {
    node: true,
    jest: true,
  },
  rules: {
    ...require("./base").rules,
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
  },
};
