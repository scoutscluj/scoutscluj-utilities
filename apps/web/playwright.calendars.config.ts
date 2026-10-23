import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	testMatch: ['dashboard-calendars.spec.ts'],
	workers: 1,
	timeout: 30000,
	use: {
		baseURL: 'http://127.0.0.1:5183',
		...devices['Desktop Chrome'],
		channel: process.env.PLAYWRIGHT_CHANNEL,
		trace: 'retain-on-failure'
	},
	webServer: [
		{ command: 'node e2e/fixtures/calendar-api.mjs', port: 3016, reuseExistingServer: false },
		{
			command: 'node build/index.js',
			port: 5183,
			reuseExistingServer: false,
			env: {
				PUBLIC_API_BASE_URL: 'http://127.0.0.1:3016',
				HOST: '127.0.0.1',
				PORT: '5183',
				ORIGIN: 'http://127.0.0.1:5183'
			}
		}
	]
});
