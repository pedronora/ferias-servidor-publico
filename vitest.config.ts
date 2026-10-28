import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['tests/nuxt/**/*.test.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom',
            },
          },
        },
      }),
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['tests/integration/setup.ts'],
          globalSetup: ['tests/integration/global-setup.ts'],
          fileParallelism: false,
          sequence: {
            concurrent: false,
          },
          maxWorkers: 1,
          testTimeout: 60_000,
          hookTimeout: 120_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: [
        'shared/**/*.ts',
        'app/**/*.ts',
        'app/**/*.vue',
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.test.ts',
        'tests/**',
        'server/database/migrations/**',
        'app/app.vue',
        'app/layouts/**',
        'app/pages/**',
      ],
      thresholds: {
        'lines': 80,
        'branches': 80,
        'functions': 80,
        'statements': 80,
        'shared/rules/**/*.ts': {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
      },
    },
  },
})
