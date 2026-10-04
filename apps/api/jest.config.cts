module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: { '^@nestjs/event-emitter$': '<rootDir>/src/__mocks__/@nestjs/event-emitter.js' },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
  // Only count source actually exercised by unit specs; excludes
  // module-wiring files (*.module.ts), DTOs/entities (no branches to
  // cover) and the bootstrap entrypoint.
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/main.ts',
    '!src/__mocks__/**',
  ],
  // Enforced via `--coverage` in CI (see .github/workflows/ci.yml).
  // Thresholds are a few points below the measured baseline (see
  // `pnpm nx run api:test -- --coverage`) so genuine regressions fail
  // the build without false-failing on normal branch-coverage noise.
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 68,
      functions: 80,
      lines: 84,
    },
  },
};
