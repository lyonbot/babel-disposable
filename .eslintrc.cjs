module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  overrides: [
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    "project": "tsconfig.json",
    extraFileExtensions: ['.vue']
  },
  plugins: [
    'vue'
  ],
  rules: {
    '@typescript-eslint/no-unsafe-argument': 0,   // for .js files
    '@typescript-eslint/semi': 'error',
    "@typescript-eslint/comma-dangle": ["error", "always-multiline"],
    "@typescript-eslint/quotes": ["error", "single", { "avoidEscape": true }],
  }
}
