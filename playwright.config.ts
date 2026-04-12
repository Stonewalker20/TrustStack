import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        "/bin/zsh -lc 'docker compose up -d mongo && export MONGO_URI=mongodb://127.0.0.1:27018 && export MONGO_DB_NAME=truststack_e2e_$RANDOM && export EMBEDDING_PROVIDER=lexical && export LLM_PROVIDER=disabled && cd backend && ./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001'",
      url: 'http://127.0.0.1:8001/health',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "/bin/zsh -lc 'cd frontend && VITE_API_BASE_URL=http://127.0.0.1:8001 npm run dev -- --host 127.0.0.1 --port 4173'",
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
