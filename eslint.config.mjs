import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

function retainLegacyFindingsAsWarnings(config) {
  if (!config.rules) return config

  const rules = { ...config.rules }
  if ('react-hooks/set-state-in-effect' in rules) rules['react-hooks/set-state-in-effect'] = 'warn'
  if ('react-hooks/use-memo' in rules) rules['react-hooks/use-memo'] = 'warn'
  if ('@typescript-eslint/no-explicit-any' in rules) rules['@typescript-eslint/no-explicit-any'] = 'warn'
  // Electron's main and preload processes intentionally use CommonJS.
  if ('@typescript-eslint/no-require-imports' in rules) rules['@typescript-eslint/no-require-imports'] = 'off'

  return { ...config, rules }
}

export default defineConfig([
  ...nextVitals.map(retainLegacyFindingsAsWarnings),
  ...nextTypeScript.map(retainLegacyFindingsAsWarnings),
  globalIgnores([
    '.next/**',
    'out/**',
    'dist/**',
    'build/**',
    'next-env.d.ts',
  ]),
])
