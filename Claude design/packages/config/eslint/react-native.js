/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...require("./base"),
  env: {
    "react-native/react-native": true,
  },
  plugins: [...(require("./base").plugins || []), "react", "react-native"],
  extends: [
    ...require("./base").extends,
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    ...require("./base").rules,
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-native/no-unused-styles": "warn",
    "react-native/no-inline-styles": "warn",
  },
};
