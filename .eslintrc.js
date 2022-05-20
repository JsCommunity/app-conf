module.exports = {
  extends: [
    // standard configuration
    "standard",

    // https://github.com/mysticatea/eslint-plugin-node#-rules
    "plugin:n/recommended",

    // disable rules handled by prettier
    "prettier",
  ],

  rules: {
    // uncomment if you are using a builder like Babel
    // "n/no-unsupported-features/es-syntax": "off",
  },
};
