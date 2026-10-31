import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import boundaries from 'eslint-plugin-boundaries';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

// 계층: app → features → ui → api → utils (tech-decisions §8, directory-structure 계층 규칙)
const elements = [
  { type: 'app', pattern: 'src/app/**' },
  { type: 'audience', pattern: 'src/features/audience/**' },
  { type: 'hosting', pattern: 'src/features/hosting/**' },
  { type: 'shared-feature', pattern: 'src/features/shared/**' },
  { type: 'ui', pattern: 'src/ui/**' },
  { type: 'api-server', pattern: 'src/api/server/**' },
  { type: 'api', pattern: 'src/api/**' },
  { type: 'utils', pattern: 'src/utils/**' },
  { type: 'env', pattern: 'src/env/**' },
  // 테스트 헬퍼(renderWithProviders). *.test.* 파일만 import한다(아래 no-restricted-imports)
  { type: 'test-support', pattern: 'src/test/**' },
];

const kyRestriction = {
  paths: [{ name: 'ky', message: 'ky는 src/api 안에서만 쓴다. 화면은 api 객체를 쓴다.' }],
  patterns: [{ group: ['ky/*'], message: 'ky는 src/api 안에서만 쓴다.' }],
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { boundaries, 'simple-import-sort': simpleImportSort },
    settings: {
      'boundaries/elements': elements,
      'boundaries/include': ['src/**/*'],
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      // 계층 요소로 등록되지 않은 폴더(src/lib 등)가 검사를 우회하지 못하게 한다
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'audience',
                        'hosting',
                        'shared-feature',
                        'ui',
                        'api',
                        'api-server',
                        'utils',
                        'env',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'audience' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['audience', 'shared-feature', 'ui', 'api', 'utils', 'env'] },
                  },
                },
              },
            },
            {
              from: { element: { type: 'hosting' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['hosting', 'shared-feature', 'ui', 'api', 'utils', 'env'] },
                  },
                },
              },
            },
            {
              from: { element: { type: 'shared-feature' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['shared-feature', 'ui', 'api', 'utils', 'env'] } },
                },
              },
            },
            {
              from: { element: { type: 'ui' } },
              allow: { to: { element: { types: { anyOf: ['ui', 'api', 'utils'] } } } },
            },
            {
              from: { element: { type: 'api-server' } },
              allow: {
                to: { element: { types: { anyOf: ['api', 'api-server', 'utils', 'env'] } } },
              },
            },
            {
              from: { element: { type: 'api' } },
              allow: { to: { element: { types: { anyOf: ['api', 'utils', 'env'] } } } },
            },
            {
              from: { element: { type: 'utils' } },
              allow: { to: { element: { types: { anyOf: ['utils'] } } } },
            },
            {
              from: { element: { type: 'env' } },
              allow: { to: { element: { types: { anyOf: ['env'] } } } },
            },
            {
              from: { element: { type: 'test-support' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['test-support', 'ui', 'api', 'utils', 'env'] } },
                },
              },
            },
            {
              // 어느 계층의 테스트 파일이든 헬퍼를 쓴다. 테스트가 아닌 파일은 no-restricted-imports가 막는다
              from: {
                element: {
                  types: { anyOf: ['app', 'audience', 'hosting', 'shared-feature', 'ui', 'api'] },
                },
              },
              allow: { to: { element: { types: { anyOf: ['test-support'] } } } },
            },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: kyRestriction.paths,
          patterns: [
            ...kyRestriction.patterns,
            { group: ['@/test/*'], message: 'src/test는 *.test.* 파일에서만 쓴다.' },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: { 'no-restricted-imports': ['error', kyRestriction] },
  },
  {
    files: ['src/api/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
  prettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'storybook-static/**',
    'next-env.d.ts',
    '.claude/**',
    'public/**',
    'playwright-report/**',
    'test-results/**',
    'qa/reports/**',
    // Figma 플러그인 빌드 결과물(tools/figma-plugin/build.mjs)
    'tools/figma-plugin/plugin/**',
  ]),
]);
