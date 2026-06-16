import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.claude', 'node_modules']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Idiom de carga de datos: `useEffect(() => { cargar() }, [])` dispara
      // setState al montar. Es el patrón estándar de fetch-on-mount; la regla del
      // React Compiler es agresiva para este caso. Warning, no error.
      'react-hooks/set-state-in-effect': 'warn',
      // Los archivos de contexto (AuthContext/ThemeContext) co-localizan el hook
      // (useAuth/useTheme) y el Provider a propósito. Solo afecta HMR en dev, cero
      // impacto en producción. Warning, no error.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
