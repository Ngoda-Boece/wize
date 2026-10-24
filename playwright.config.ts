import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// E2E tests run against the production build in demo mode (no Supabase / no
// Anthropic credentials) so they are deterministic and free.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      ANTHROPIC_API_KEY: "",
    },
  },
});
