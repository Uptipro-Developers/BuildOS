import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BUILDOS_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: true,
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Servers are already running — reuse them
  webServer: {
    command: 'echo "servers already running"',
    url: process.env.BUILDOS_URL || 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 5_000,
  },
});
