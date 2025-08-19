// eslint.config.mjs
// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignore
  {
    ignores: ['eslint.config.mjs', 'node_modules', 'dist', 'build', 'coverage'],
  },

  // JS recommended
  eslint.configs.recommended,

  // TS recommended (KHÔNG type-checked để đỡ phiền)
  ...tseslint.configs.recommended,

  // Prettier as ESLint rule
  eslintPluginPrettierRecommended,

  // Project settings + relaxed rules
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        ecmaVersion: 'latest',
        tsconfigRootDir: import.meta.dirname,
        // KHÔNG bật projectService -> tránh type-checked linting
      },
    },
    rules: {
      // Hết lỗi "Delete ␍" (CRLF trên Windows)
      'linebreak-style': 'off',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],

      // Giảm phiền TS rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Tắt các rule "no-unsafe-..." hay kêu (dù ở profile này vốn ít xuất hiện)
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',

      // Mấy rule dễ gây phiền khi làm việc async
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
);
