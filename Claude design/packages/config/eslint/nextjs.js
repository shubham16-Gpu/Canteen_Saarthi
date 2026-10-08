/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...require("./base"),
  extends: [
    ...require("./base").extends,
    "next/core-web-vitals",
  ],
  env: {
    browser: true,
    node: true,
  },
  rules: {
    ...require("./base").rules,
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "@next/next/no-html-link-for-pages": "off",
  },
};
