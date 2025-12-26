module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'timesheet/**/*.controller.ts',
    'timesheet/**/*.service.ts',

    'meeting-rooms/**/*.controller.ts',
    'meeting-rooms/**/*.service.ts',

    'news/**/*.controller.ts',
    'news/**/*.service.ts',

    'requests/**/*.controller.ts',
    'requests/**/*.service.ts',

    'user-profile/**/*.controller.ts',
    'user-profile/**/*.service.ts',

    '!**/*.spec.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^uuid$': 'uuid',
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
};
