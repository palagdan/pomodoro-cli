import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    // Every test file gets its own temporary HOME, so nothing touches the real ~/.pomodoro-cli
    setupFiles: ['test/helpers/setup.ts'],
    restoreMocks: true,
  },
});
