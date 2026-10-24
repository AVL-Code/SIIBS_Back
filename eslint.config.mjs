import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const BOUNDED_CONTEXT_MODULES = ['iam', 'audit', 'registry', 'assistance', 'education'];

const moduleBoundaryConfigs = BOUNDED_CONTEXT_MODULES.map((currentModule) => {
  const otherModules = BOUNDED_CONTEXT_MODULES.filter((mod) => mod !== currentModule);
  const restrictedPatterns = otherModules.flatMap((other) => [
    `**/modules/${other}/*`,
    `**/modules/${other}/**`,
    `@modules/${other}/*`,
    `@modules/${other}/**`,
    `../${other}/*`,
    `../${other}/**`,
    `../../${other}/*`,
    `../../${other}/**`,
    `../../../${other}/*`,
    `../../../${other}/**`,
  ]);

  return {
    files: [`src/modules/${currentModule}/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: restrictedPatterns,
              message: `Deep imports into another bounded context module are forbidden (11-tech-spec.md §3.2). Import only from the module's public barrel (index.ts).`,
            },
          ],
        },
      ],
    },
  };
});

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.mjs', 'vitest.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/*.ts', 'src/shared/**/*.ts', 'src/db/**/*.ts', 'test/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/modules/*/*',
                '**/modules/*/**',
                '@modules/*/*',
                '@modules/*/**',
              ],
              message:
                'Deep imports into a bounded context module are forbidden (11-tech-spec.md §3.2). Import only from the module root (index.ts).',
            },
          ],
        },
      ],
    },
  },
  ...moduleBoundaryConfigs,
);

