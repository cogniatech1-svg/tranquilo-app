import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Pure TypeScript — no DOM needed
    environment: 'node',
    // Only pick up files inside lib/__tests__
    include: ['lib/__tests__/**/*.test.ts'],
    // Reporter: verbose so each test name is shown on failure
    reporters: ['verbose'],
  },
})
