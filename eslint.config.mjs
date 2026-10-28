// Estilo adotado (ESLint Stylistic, preset "customize"):
// - indentação com 2 espaços
// - aspas simples
// - sem ponto e vírgula
// - vírgula final em listas multilinha
// - brace-style 1tbs
// - fim de linha LF
// A formatação é responsabilidade exclusiva do ESLint. Não há Prettier/Biome/dprint.

import stylistic from '@stylistic/eslint-plugin'
import vueA11y from 'eslint-plugin-vuejs-accessibility'
import vitest from '@vitest/eslint-plugin'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: false,
    commaDangle: 'always-multiline',
    braceStyle: '1tbs',
    linebreak: 'unix',
  }),
  {
    rules: {
      'vue/multi-word-component-names': 'error',
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/no-mutating-props': 'error',
      'vue/require-default-prop': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['app/pages/**/*.vue', 'app/layouts/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    plugins: {
      'vuejs-accessibility': vueA11y,
    },
    rules: {
      ...vueA11y.configs.recommended.rules,
      'vuejs-accessibility/label-has-for': ['error', { required: 'id' }],
    },
  },
  {
    files: ['**/*.vue'],
    plugins: {
      'better-tailwindcss': betterTailwindcss,
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/assets/css/main.css',
      },
    },
    rules: {
      'better-tailwindcss/no-duplicate-classes': 'error',
      'better-tailwindcss/no-unnecessary-whitespace': 'error',
    },
  },
  {
    files: ['tests/**/*.{test,spec}.ts'],
    plugins: {
      vitest,
    },
    rules: {
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
      'vitest/expect-expect': ['error', { assertFunctionNames: ['expect', 'expectDatabaseError'] }],
      'vitest/valid-title': 'error',
    },
  },
  {
    files: ['scripts/**/*.ts', 'drizzle.config.ts', 'vitest.config.ts', 'playwright.config.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: [
      '.nuxt/**',
      '.output/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'blob-report/**',
      'drizzle/migrations/**',
      'drizzle/meta/**',
    ],
  },
)
