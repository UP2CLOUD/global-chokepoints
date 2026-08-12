import { fixupPluginRules } from '@eslint/compat';
import coreWebVitals from 'eslint-config-next/core-web-vitals';

// eslint-config-next@16 bundles a Babel ESLint parser for plain JS files.
// That parser's bundled eslint-scope lacks addGlobals(), which ESLint 10 requires.
// Our project is TypeScript-only, so we remove the Babel parser from the base
// config and let ESLint use its built-in Espree parser for any plain JS files.
// The @typescript-eslint/parser (config object 1) still handles .ts/.tsx files.
const wrapped = coreWebVitals.map((config) => {
  let result = config;

  // Strip bundled Babel parser — incompatible with ESLint 10 scope manager API
  if (result.languageOptions?.parser?.meta?.name === 'eslint-config-next/parser') {
    const { parser: _removed, ...rest } = result.languageOptions;
    result = { ...result, languageOptions: rest };
  }

  // Wrap eslint-plugin-react with @eslint/compat so its legacy context.getFilename()
  // calls work under ESLint 10 (which replaced that method with context.filename).
  if (result.plugins?.['react']) {
    result = {
      ...result,
      plugins: {
        ...result.plugins,
        react: fixupPluginRules(result.plugins['react']),
      },
    };
  }

  return result;
});

// Extract shared plugin instances to avoid "Cannot redefine plugin" errors
// in the subsequent rule-override config object.
const tsPlugin = wrapped.find((c) => c.plugins?.['@typescript-eslint'])?.plugins?.['@typescript-eslint'];
const nextPlugin = wrapped.find((c) => c.plugins?.['@next/next'])?.plugins?.['@next/next'];

export default [
  ...wrapped,
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@next/next': nextPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
    },
  },
];
