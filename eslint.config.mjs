// @ts-check

import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      'sort-keys': [
        'warn',
        'asc',
        {
          allowLineSeparatedGroups: true,
          caseSensitive: false,
          minKeys: 2,
          natural: true,
        },
      ],
    },
  },
  // ESLint デフォルト無視パターンをオーバーライド
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])

export default eslintConfig
