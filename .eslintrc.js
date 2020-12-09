module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'no-console': 0,
    'no-await-in-loop': 0,
    'no-underscore-dangle': 0,
    'no-param-reassign': 0,
    'consistent-return': 0,
  },
};
