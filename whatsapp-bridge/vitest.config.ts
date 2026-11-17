import { defineConfig } from 'vitest/config'

/** Eigen config: anders neemt Vitest die van het dashboard (repo-root), en die vraagt de root-dependencies. */
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
