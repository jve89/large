// ESLint is invoked directly (`eslint .`), not through a framework wrapper — see
// ARCHITECTURE.md -> Stack. @eslint/js supplies the core recommended rules and
// typescript-eslint supplies the parser, without which ESLint cannot read a .ts
// file at all.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'next-env.d.ts',
      'prisma/migrations/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Unused values are a real signal in this codebase; an underscore prefix is
      // the documented way to say "deliberately unused".
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
)
