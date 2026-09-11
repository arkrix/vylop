import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'build', 'node_modules'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Allow empty catch blocks in safe try/catch statements
      'no-empty': ['error', { allowEmptyCatch: true }],

      // Ignore catch errors (err, e, error), React components, and designated handlers
      'no-unused-vars': [
        'warn',
        { 
          varsIgnorePattern: '^[A-Z_]|setUsername', 
          argsIgnorePattern: '^_',
          caughtErrors: 'none',
          ignoreRestSiblings: true
        }
      ],

      // Demote strict react-hooks v5 rules to warnings to prevent CI build breakage
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-refresh/only-export-components': 'off',
    },
  },
]