import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
  },
  {
    // Components and pages must go through the repository layer, never touch storage directly.
    files: ['src/components/**', 'src/pages/**', 'src/hooks/**'],
    rules: {
      'no-restricted-globals': ['error', 'localStorage', 'sessionStorage'],
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/data/mock/*', '**/data/mock'], message: 'Use useRepositories(); only src/data/index.ts picks the implementation.' }] },
      ],
    },
  },
);
