module.exports = {
  env: { es6: true, node: true },
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
  globals: { wx: 'readonly', GameGlobal: 'writable', requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly' },
  rules: {}
};
